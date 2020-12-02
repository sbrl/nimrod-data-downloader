# Using the radar2caesar converter

The `radar2caesar` converter converts a downloaded `.jsonl.gz` file containing rainfall radar data (formatted as JSON objects, with 1 per line) to a format that CAESAR-Lisflood (it's been specifically tested with [HAIL-CAESAR](https://github.com/dvalters/HAIL-CAESAR), which was [patched](https://github.com/sbrl/HAIL-CAESAR) to accept data in on the standard input and push data out to the standard output). It requires a DEM file (i.e. a heightmap) formatted as a `.asc` file in order to do the conversion.


## Before you start
 - Make sure you've [run the downloader](https://github.com/sbrl/nimrod-data-downloader/blob/master/docs/usage-downloader.md) and got a `nimrod_ceda.jsonl.gz` file
 - Obtain a heightmap as a `.asc` file (my [terrain50-cli](https://www.npmjs.com/package/terrain50-cli) project may help here)
 - Ensure that the downloaded rainfall radar data is the same aspect ratio as your heightmap


## Running the converter
Running the converter is done like so:

```bash
nimrod-data-downloader radar2caesar --input path/to/nimrod_ceda.jsonl.gz --output path/to/output_directory --heightmap path/to/heightmap.asc
```

Let's break this down and explain it bit by bit.

Part		| Meaning
------------|------------------------------------
`nimrod-data-downloader` | Calls the nimrod-data-downloader program. If you installed it locally, you will need to specify the path to `index.mjs` instead (it's usually `path/to/repo_root/src/index.mjs`).
`radar2caesar`	| The subcommand we want to execute.
`--input path/to/nimrod_ceda.jsonl.gz`	| Specifies the path to the input file containing the rainfall radar data.
`--output path/to /output_directory`	| Specifies the path to a new directory (that may or may not exist) to write the output to.
`--heightmap path/to/heightmap.asc`		| Specifies the path to the reference heightmap. This is used when writing the hydro index file to ensure it's the right resolution.


### Extra options
The program also supports 2 extra modes of operation. These can be toggled by appending the following flags to the above `nimrod-data-downloader` calll:

 - `--dry-run`: Enables dry run mode. Performs the conversion, but doesn't write any output to disk.
 - `--data-stdout`: Writes the main converted rainfall radar data to the standard output instead of to disk. If you have a large extracted area, you may gain significant disk savings by piping the standard output of this program directly into HAIL-CAESAR, but you'll need to run the [patched version of HAIL-CAESAR](https://github.com/sbrl/HAIL-CAESAR) because the normal version doesn't support this. Note also that all the progress information is printed to the standard _error_, which ensures that it doesn't get mixed up with the converted data.

For example, to enable the `--data-stdout` option, you would do this:

```bash
nimrod-data-downloader radar2caesar --input path/to/nimrod_ceda.jsonl.gz --output path/to/output_directory --heightmap path/to/heightmap.asc --data-stdout
```
