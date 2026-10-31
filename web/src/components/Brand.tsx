/**
 * Criminals logo, drawn from the exact paths in the "Criminals" design system (Assets › Logos).
 * The C10 / letters use the current text colour (bone on dark, near-black on light);
 * the slashes are always heist-red, as the brand book requires. Never retype the name in a font.
 */

const MARK_C = 'M802.2 339.0 L771.0 370.2 L771.0 462.5 L804.2 494.8 L916.5 494.8 L948.8 463.5 L949.8 460.5 L948.8 369.2 L916.5 338.0ZM812.8 383.2 L819.2 376.8 L901.5 376.8 L908.0 383.2 L908.0 449.5 L901.5 456.0 L818.2 456.0 L812.8 450.5ZM721.2 338.0 L705.2 351.0 L669.0 387.5 L706.0 388.2 L706.0 494.5 L747.5 494.8 L747.8 338.2ZM540.0 348.2 L540.0 489.5 L660.2 602.8 L915.8 602.5 L840.5 528.0 L701.2 528.0 L622.8 455.5 L622.8 380.2 L709.2 301.8 L833.5 300.8 L904.5 229.0 L674.2 229.0Z';
const MARK_SLASH = 'M866.0 528.2 L940.2 602.8 L996.8 602.5 L923.5 528.0ZM987.8 228.2 L930.2 228.0 L858.0 300.5 L862.2 301.8 L915.5 300.8Z';

const WORD = 'M1185.2 674.0 L1180.0 679.2 L1170.0 709.2 L1173.0 716.5 L1181.2 725.8 L1239.5 725.8 L1242.0 730.5 L1239.0 739.5 L1236.5 741.0 L1165.2 741.0 L1156.0 763.5 L1246.5 763.8 L1262.8 751.5 L1272.8 722.5 L1271.8 716.2 L1261.5 704.0 L1202.2 704.0 L1200.8 701.2 L1203.8 693.2 L1207.2 689.8 L1267.5 689.8 L1279.8 667.2 L1196.2 667.0ZM1091.2 667.0 L1059.0 763.5 L1136.5 763.8 L1150.5 741.0 L1095.8 740.5 L1119.8 667.2ZM1032.8 667.2 L1001.2 667.0 L920.0 763.5 L948.5 763.8 L1005.8 695.2 L1010.5 691.8 L1017.0 724.5 L990.2 725.0 L973.0 745.5 L1020.5 745.8 L1024.2 763.8 L1051.5 763.8ZM837.2 667.0 L805.0 763.5 L834.8 763.5 L852.8 708.2 L854.5 707.8 L884.2 763.8 L911.5 763.8 L943.8 667.2 L915.2 667.0 L896.2 722.0 L865.5 667.0ZM817.5 667.0 L787.0 667.2 L754.2 763.8 L784.8 763.5ZM591.2 763.8 L621.8 763.5 L640.2 708.8 L643.0 711.2 L660.2 763.8 L666.5 763.8 L721.5 708.8 L722.0 711.5 L704.0 763.5 L733.5 763.8 L766.5 667.0 L730.2 667.0 L677.5 720.0 L675.8 719.5 L670.8 700.2 L658.5 667.0 L625.2 667.0ZM435.2 667.0 L400.0 763.5 L429.5 763.8 L456.2 690.8 L508.5 690.8 L510.0 696.5 L504.5 711.0 L501.5 713.0 L455.2 713.0 L447.0 735.5 L467.5 735.8 L486.2 763.8 L520.5 763.8 L500.8 736.2 L513.5 735.8 L529.8 722.5 L542.8 684.5 L542.8 680.2 L531.5 667.0ZM294.2 678.0 L266.0 748.2 L267.0 752.5 L276.2 763.8 L379.5 763.8 L388.5 738.0 L306.2 738.0 L303.8 734.2 L321.2 692.8 L325.2 690.8 L406.5 690.8 L414.8 667.2 L310.2 667.0Z';
const WORD_SLASH = 'M608.5 644.0 L564.0 683.2 L541.0 760.2 L534.2 788.8 L576.8 744.5Z';

/** The C10 mark (square spots: sidebar, login, avatar-size places). */
export function Mark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="70 110 460 380" role="img" aria-label="Criminals">
      <g transform="translate(80.0 119.5) scale(0.9628) translate(-540 -228)">
        <path d={MARK_C} fill="currentColor" fillRule="evenodd" />
        <path d={MARK_SLASH} fill="var(--heist-red)" fillRule="evenodd" />
      </g>
    </svg>
  );
}

/** The CRIMINALS wordmark (wide strips: sidebar header, login). */
export function Wordmark({ height = 18, className }: { height?: number; className?: string }) {
  return (
    <svg className={className} height={height} width={(height * 1054) / 185} viewBox="0 0 1054 185" role="img" aria-label="Criminals">
      <g transform="translate(20.0 20.0) translate(-266 -644)">
        <path d={WORD} fill="currentColor" fillRule="evenodd" />
        <path d={WORD_SLASH} fill="var(--heist-red)" fillRule="evenodd" />
      </g>
    </svg>
  );
}
