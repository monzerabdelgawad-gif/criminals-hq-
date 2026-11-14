/**
 * Notion bridge for the Content page. Keep the integration secret in Script
 * Properties; it is never sent to the browser.
 * Required properties: NOTION_TOKEN. NOTION_DATA_SOURCE_ID defaults to the
 * Criminals Content data source created for this dashboard.
 */
var NOTION_API_VERSION_ = '2026-03-11';
var NOTION_DEFAULT_DATA_SOURCE_ = '1dd7aafb-399b-82a7-b316-87d8dc0eae8b';

function notionConfig_() {
  var p = props_();
  var token = p.getProperty('NOTION_TOKEN');
  if (!token) throw new Error('content_not_configured');
  return { token: token, dataSourceId: p.getProperty('NOTION_DATA_SOURCE_ID') || NOTION_DEFAULT_DATA_SOURCE_ };
}

function notionRequest_(method, path, payload) {
  var cfg = notionConfig_();
  var options = { method: method, headers: { Authorization: 'Bearer ' + cfg.token, 'Notion-Version': NOTION_API_VERSION_ }, muteHttpExceptions: true };
  if (payload !== undefined) { options.contentType = 'application/json'; options.payload = JSON.stringify(payload); }
  var res = UrlFetchApp.fetch('https://api.notion.com/v1' + path, options);
  var code = res.getResponseCode(), data = JSON.parse(res.getContentText() || '{}');
  if (code < 200 || code >= 300) {
    console.error('Notion API ' + code + ': ' + (data.message || res.getContentText()));
    var err = new Error(code === 401 ? 'notion_unauthorized' : code === 403 ? 'notion_forbidden' : code === 404 ? 'notion_not_found' : 'notion_api_error');
    err.status = code; throw err;
  }
  return data;
}

function notionDataSource_() {
  var cfg = notionConfig_();
  return notionRequest_('get', '/data_sources/' + encodeURIComponent(cfg.dataSourceId));
}

function notionUsers_() {
  try {
    var out = [], cursor = '';
    do {
      var res = notionRequest_('get', '/users?page_size=100' + (cursor ? '&start_cursor=' + encodeURIComponent(cursor) : ''));
      out = out.concat(res.results || []); cursor = res.has_more ? res.next_cursor : '';
    } while (cursor && out.length < 500);
    return out.map(function (u) { return { id: u.id, name: u.name || u.type || 'Notion user' }; });
  } catch (e) {
    if (e.status === 403) return [];
    throw e;
  }
}

function notionMetadata_() {
  var cache = CacheService.getScriptCache(), cached = cache.get('CONTENT_META');
  if (cached) { try { return JSON.parse(cached); } catch (e) { /* refresh stale cache */ } }
  var source = notionDataSource_(), status = source.properties && source.properties.Status;
  var meta = { statuses: status && status.select && status.select.options ? status.select.options.map(function (o) { return o.name; }) : [], users: notionUsers_() };
  cache.put('CONTENT_META', JSON.stringify(meta), 600);
  return meta;
}

function apiContentList_(user) {
  var cfg = notionConfig_(), rows = [], cursor = '';
  do {
    var body = { page_size: 100, sorts: [{ property: 'Name', direction: 'ascending' }] };
    if (cursor) body.start_cursor = cursor;
    var res = notionRequest_('post', '/data_sources/' + encodeURIComponent(cfg.dataSourceId) + '/query', body);
    rows = rows.concat(res.results || []); cursor = res.has_more ? res.next_cursor : '';
  } while (cursor && rows.length < 1000);
  var meta = notionMetadata_();
  return { ok: true, pages: rows.map(contentPageSummary_), statuses: meta.statuses, users: meta.users, syncedAt: new Date().toISOString() };
}

function contentPageSummary_(p) {
  var props = p.properties || {}, titleProp = props.Name || props.title || {}, statusProp = props.Status || {}, peopleProp = props.Assign || {};
  return {
    id: p.id,
    title: ((titleProp.title || []).map(function (x) { return x.plain_text || (x.text && x.text.content) || ''; }).join('')),
    status: statusProp.select && statusProp.select.name || '',
    assignees: (peopleProp.people || []).map(function (x) { return x.id; }),
    assigneeNames: (peopleProp.people || []).map(function (x) { return x.name || x.type || x.id; }),
    editedAt: p.last_edited_time || '',
    url: p.url || ('https://www.notion.so/' + String(p.id || '').replace(/-/g, ''))
  };
}

function apiContentGet_(user, body) {
  if (!body.id) return { ok: false, error: 'not_found' };
  var blocks = [], cursor = '';
  do {
    var path = '/blocks/' + encodeURIComponent(body.id) + '/children?page_size=100' + (cursor ? '&start_cursor=' + encodeURIComponent(cursor) : '');
    var res = notionRequest_('get', path);
    blocks = blocks.concat(res.results || []); cursor = res.has_more ? res.next_cursor : '';
  } while (cursor && blocks.length < 1000);
  return { ok: true, markdown: notionBlocksToMarkdown_(blocks) };
}

function apiContentSave_(user, body) {
  if (!canEdit_(user, 'content')) return { ok: false, error: 'no_permission' };
  var title = String(body.title || '').trim();
  if (!title) return { ok: false, error: 'missing_title' };
  if (body.id && body.bodyChanged) {
    var unsupported = notionUnsupportedBlocks_(body.id);
    if (unsupported.length && !body.allowUnsupportedReplace) return { ok: false, error: 'content_has_unsupported', blocks: unsupported };
  }
  var cfg = notionConfig_(), properties = { Name: { title: [{ text: { content: title.slice(0, 2000) } }] } };
  if (body.status !== undefined) properties.Status = { select: body.status ? { name: String(body.status) } : null };
  properties.Assign = { people: (body.assignees || []).slice(0, 100).map(function (id) { return { id: String(id) }; }) };
  var page;
  if (body.id) {
    var current = notionRequest_('get', '/pages/' + encodeURIComponent(body.id));
    if (body.expectedEditedAt && current.last_edited_time !== body.expectedEditedAt) return { ok: false, error: 'content_conflict', page: contentPageSummary_(current) };
    page = notionRequest_('patch', '/pages/' + encodeURIComponent(body.id), { properties: properties });
  } else {
    page = notionRequest_('post', '/pages', { parent: { type: 'data_source_id', data_source_id: cfg.dataSourceId }, properties: properties });
  }
  if (!body.id || body.bodyChanged) replaceNotionBody_(page.id, String(body.markdown || ''));
  var fresh = notionRequest_('get', '/pages/' + encodeURIComponent(page.id));
  return { ok: true, page: contentPageSummary_(fresh), syncedAt: new Date().toISOString() };
}

function apiContentArchive_(user, body) {
  if (!canEdit_(user, 'content')) return { ok: false, error: 'no_permission' };
  if (!body.id) return { ok: false, error: 'not_found' };
  var page = notionRequest_('patch', '/pages/' + encodeURIComponent(body.id), { archived: true });
  return { ok: true, id: page.id };
}

function notionBlocksToMarkdown_(blocks) {
  return blocks.map(function (b) {
    var type = b.type, data = b[type] || {};
    var text = (data.rich_text || data.title || []).map(function (r) {
      var s = r.plain_text || (r.text && r.text.content) || '';
      if (r.href) s = '[' + s + '](' + r.href + ')';
      if (r.annotations && r.annotations.code) s = '`' + s + '`';
      if (r.annotations && r.annotations.bold) s = '**' + s + '**';
      if (r.annotations && r.annotations.italic) s = '*' + s + '*';
      return s;
    }).join('');
    if (type === 'heading_1') return '# ' + text;
    if (type === 'heading_2') return '## ' + text;
    if (type === 'heading_3') return '### ' + text;
    if (type === 'bulleted_list_item') return '- ' + text;
    if (type === 'numbered_list_item') return '1. ' + text;
    if (type === 'quote') return '> ' + text;
    if (type === 'to_do') return (data.checked ? '- [x] ' : '- [ ] ') + text;
    if (type === 'code') return '```' + (data.language && data.language !== 'plain text' ? data.language : '') + '\n' + text + '\n```';
    if (type === 'divider') return '---';
    return text;
  }).join('\n\n');
}

function notionUnsupportedBlocks_(pageId) {
  var supported = ['paragraph', 'heading_1', 'heading_2', 'heading_3', 'bulleted_list_item', 'numbered_list_item', 'quote', 'to_do', 'code', 'divider'];
  var out = [], cursor = '';
  do {
    var path = '/blocks/' + encodeURIComponent(pageId) + '/children?page_size=100' + (cursor ? '&start_cursor=' + encodeURIComponent(cursor) : '');
    var res = notionRequest_('get', path);
    (res.results || []).forEach(function (b) { if (supported.indexOf(b.type) < 0 || b.has_children) out.push(b.type); });
    cursor = res.has_more ? res.next_cursor : '';
  } while (cursor);
  return out;
}

function markdownToNotionBlocks_(markdown) {
  var lines = String(markdown || '').replace(/\r/g, '').split('\n'), out = [], code = false, codeLang = '', codeLines = [];
  function rich(text) {
    var out = [], re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)]+\))/g, value = String(text), last = 0, m;
    function add(value, annotations, link) {
      for (var i = 0; i < value.length; i += 2000) {
        var item = { type: 'text', text: { content: value.slice(i, i + 2000) } };
        if (annotations) item.annotations = annotations;
        if (link) item.text.link = { url: link };
        out.push(item);
      }
    }
    while ((m = re.exec(value))) {
      if (m.index > last) add(value.slice(last, m.index));
      var token = m[0], inner = token, ann = null, href = '';
      if (token.slice(0, 2) === '**') { inner = token.slice(2, -2); ann = { bold: true }; }
      else if (token[0] === '*') { inner = token.slice(1, -1); ann = { italic: true }; }
      else if (token[0] === '`') { inner = token.slice(1, -1); ann = { code: true }; }
      else { var lm = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/); if (lm) { inner = lm[1]; href = lm[2]; } }
      add(inner, ann, href); last = re.lastIndex;
    }
    if (last < value.length) add(value.slice(last));
    return out.length ? out : [{ type: 'text', text: { content: '' } }];
  }
  function flushCode() {
    if (codeLines.length) out.push({ object: 'block', type: 'code', code: { rich_text: rich(codeLines.join('\n')), language: codeLang || 'plain text' } });
    codeLines = []; code = false; codeLang = '';
  }
  lines.forEach(function (line) {
    var fence = line.match(/^```(.*)$/);
    if (fence) { if (code) flushCode(); else { code = true; codeLang = fence[1].trim().slice(0, 50); } return; }
    if (code) { codeLines.push(line); return; }
    var m;
    if (/^\s*$/.test(line)) return;
    if ((m = line.match(/^###\s+(.*)$/))) out.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: rich(m[1]) } });
    else if ((m = line.match(/^##\s+(.*)$/))) out.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: rich(m[1]) } });
    else if ((m = line.match(/^#\s+(.*)$/))) out.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: rich(m[1]) } });
    else if ((m = line.match(/^- \[([ xX])\]\s*(.*)$/))) out.push({ object: 'block', type: 'to_do', to_do: { rich_text: rich(m[2]), checked: m[1].toLowerCase() === 'x' } });
    else if ((m = line.match(/^[-*]\s+(.*)$/))) out.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: rich(m[1]) } });
    else if ((m = line.match(/^\d+[.)]\s+(.*)$/))) out.push({ object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: rich(m[1]) } });
    else if ((m = line.match(/^>\s?(.*)$/))) out.push({ object: 'block', type: 'quote', quote: { rich_text: rich(m[1]) } });
    else if (/^---+$/.test(line.trim())) out.push({ object: 'block', type: 'divider', divider: {} });
    else out.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: rich(line) } });
  });
  if (code) flushCode();
  return out;
}

function replaceNotionBody_(pageId, markdown) {
  var cursor = '', blocks = [];
  do {
    var path = '/blocks/' + encodeURIComponent(pageId) + '/children?page_size=100' + (cursor ? '&start_cursor=' + encodeURIComponent(cursor) : '');
    var res = notionRequest_('get', path);
    blocks = blocks.concat(res.results || []); cursor = res.has_more ? res.next_cursor : '';
  } while (cursor && blocks.length < 1000);
  var fresh = markdownToNotionBlocks_(markdown);
  for (var i = 0; i < fresh.length; i += 100) notionRequest_('patch', '/blocks/' + encodeURIComponent(pageId) + '/children', { children: fresh.slice(i, i + 100) });
  blocks.forEach(function (b) { notionRequest_('delete', '/blocks/' + encodeURIComponent(b.id)); });
}
