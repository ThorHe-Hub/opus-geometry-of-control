# Fonts

`index.html` embeds subsets (WOFF2, base64) of these fonts, all under the SIL Open Font License 1.1. The upstream
license files are kept here unchanged.

| Family in the film | Source font | License file | Reserved Font Name |
|---|---|---|---|
| Noto Serif SC | Noto Serif SC | NotoSerifSC-OFL.txt | none |
| Michroma | Michroma | Michroma-OFL.txt | none |
| GoC Mono | IBM Plex Mono | IBMPlexMono-OFL.txt | "Plex" |
| STIX Two Text | STIX Two Text | STIXTwoText-OFL.txt | "TM Math" |
| STIX Two Math | STIX Two Math | STIXTwoMath-OFL.txt | "TM Math" |
| Cormorant Garamond | Cormorant Garamond | CormorantGaramond-OFL.txt | none |
| Caveat | Caveat | Caveat-OFL.txt | none |
| GoC Oldstyle | IM Fell English | IMFellEnglish-OFL.txt | "IM FELL English Roman / Italic" (in the font's copyright string) |

A subset counts as a Modified Version under the OFL, and a Modified Version may not use a Reserved Font Name.
`tools/subset_fonts.py` therefore renames IBM Plex Mono and IM Fell English in their name tables and in CSS,
keeps every copyright notice as it is, and adds the OFL notice to any font that lacked one.
