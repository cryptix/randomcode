signed=0;
while [ $signed -lt 50000 ];
do sleep 5;
signed=$(curl "https://epetitionen.bundestag.de/index.php?action=petition;sa=details;petition=22697" 2>/dev/null \
	| grep pet_det_td_4 \
	| cut -d '"' -f3 \
	| cut -d ' ' -f1 \
	| tr -d '>' \
	)
left=$(echo "50000 - $signed" | bc)
echo $(date): $signed ppl signed. $left left
done