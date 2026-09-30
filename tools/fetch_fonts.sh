#!/usr/bin/env bash
# Download the OFL fonts (full TTF) from Google Fonts into tools/fonts-src.
set -e
cd "$(dirname "$0")/fonts-src"
G=https://fonts.gstatic.com/s
list=(
  "Caveat-500.ttf|$G/caveat/v23/WnznHAc5bAfYB2QRah7pcpNvOx-pjcB9SII.ttf"
  "CormorantGaramond-500i.ttf|$G/cormorantgaramond/v21/co3smX5slCNuHLi8bLeY9MK7whWMhyjYrGFEsdtdc62E6zd5wDDOjw.ttf"
  "CormorantGaramond-500.ttf|$G/cormorantgaramond/v21/co3umX5slCNuHLi8bLeY9MK7whWMhyjypVO7abI26QOD_s06GnM.ttf"
  "IBMPlexMono-400.ttf|$G/ibmplexmono/v20/-F63fjptAgt5VM-kVkqdyU8n5ig.ttf"
  "IBMPlexMono-500.ttf|$G/ibmplexmono/v20/-F6qfjptAgt5VM-kVkqdyU8n3twJ8lc.ttf"
  "IMFellEnglish-400i.ttf|$G/imfellenglish/v14/Ktk3ALSLW8zDe0rthJysWrnLsAzHFaOd.ttf"
  "IMFellEnglish-400.ttf|$G/imfellenglish/v14/Ktk1ALSLW8zDe0rthJysWrnLsAz3Fw.ttf"
  "Michroma-400.ttf|$G/michroma/v21/PN_zRfy9qWD8fEagAMg6.ttf"
  "NotoSerifSC-400.ttf|$G/notoserifsc/v35/H4cyBXePl9DZ0Xe7gG9cyOj7uK2-n-D2rd4FY7SCqyWv.ttf"
  "NotoSerifSC-600.ttf|$G/notoserifsc/v35/H4cyBXePl9DZ0Xe7gG9cyOj7uK2-n-D2rd4FY7RcrCWv.ttf"
  "NotoSerifSC-900.ttf|$G/notoserifsc/v35/H4cyBXePl9DZ0Xe7gG9cyOj7uK2-n-D2rd4FY7QrrCWv.ttf"
  "STIXTwoText-400i.ttf|$G/stixtwotext/v18/YA9Er02F12Xkf5whdwKf11l0p7uWhf8lJUzXZT2omsvbURU.ttf"
  "STIXTwoText-400.ttf|$G/stixtwotext/v18/YA9Gr02F12Xkf5whdwKf11l0jbKkeidMTtZ5Yihg2SOY.ttf"
)
for item in "${list[@]}"; do
  name="${item%%|*}"; url="${item#*|}"
  if [ ! -s "$name" ]; then curl -s --fail --max-time 300 -o "$name" "$url" & fi
done
wait
for item in "${list[@]}"; do name="${item%%|*}"; printf '%10s  %s\n' "$(stat -c %s "$name")" "$name"; done
