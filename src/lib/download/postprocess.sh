#!/usr/bin/env bash

cd "$(dirname "$(readlink -f "$0")")" || { echo ">>> Error cding to script directory" >&2; exit 1; };

if [[ ! -d "./results" ]]; then
	echo "Error: Directory at './results' does not exist." >&2;
	exit 1;
fi
cd "./results" || { echo "Failed to cd into results subdirectory"; exit 1; };

find . -type f -name "*.gz" -printf "%f\n" | sort -n | xargs --verbose -n1 gzip -dc | gzip >"../nimrod_ceda.jsonstream.gz";
