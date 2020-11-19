# nimrod-data-downloader

> Data downloader for the 1km NIMROD rainfall radar data

This package downloads **1km** NIMROD rainfall radar data (5km has not been tested), extracting the data within the given bounding box. It does so in a parallel fashion - it can take advantage of as many cores as your machine has.

I implemented this as part of my PhD.


## System Requirements
 - Operating System: Linux is recommended (e.g. Ubuntu), Windows may work but is untested.
 - _Lots_ of disk space (extra space is needed to work in while downloading the data; heavy IO is performed too, so a fast disk will yield benefits)
 - As many CPU cores as you can manage (the process is really rather CPU intensive)
 - [Node.js](https://nodejs.org/) (tested with v14+)
 - Windows users will need [Git Bash](https://git-scm.com/downloads) installed to run the post-downloader script
 - The following CLI commands: `tar`, `gzip`, `find` (the GNU / Linux version), `xargs`, `sort`, `dirname`, `readlink` (Windows users: these should come with Git Bash - it's recommended to use this program through Git Bash)
 - Basic command-line / Terminal knowledge


## Installation
Install the npm package (this is the recommended installation method):

```bash
npm install --global nimrod-data-downloader # It hasn't been published yet, but it will be
```

Alternatively, you can install from the git repository. Do so by cloning the repository,  and then installing the dependencies:

```bash
git clone https://github.com/sbrl/nimrod-data-downloader.git
cd nimrod-data-downloader;
npm install;
```

You may also have obtained this codebase through a number of other different places, such as my University's archives or from some other archive that this program may be stored in (e.g. attached to any publications - which I have not yet made at the time of typing, so I don't understand the process thereof yet). In these instances, open your terminal (Linux) or Git Bash command line (Windows), and do the following:

```bash
cd path/to/nimrod-data-downloader.git
npm install;
```

Finally, you may install directly from the GitHub repository with `npm` like so:

```bash
npm install https://github.com/sbrl/nimrod-data-downloader.git
```

If you do this, follow later instructions as if you installed with npm.

## Usage
The downloader performs the following steps:

1. Download each file in turn
2. Pass off downloaded files to worker processes
3. Worker processes parse the file and write the result as a `.json.gz` file to the output directory
4. A Bash script is generated and written to the output directory which finalises the downloaded data

The Bash script must be run manually (see below), but steps 1-3 are done automatically.

The program comes with inbuilt help text. To access this, execute the program with the `--help` command-line argument. If you installed through npm:

```bash
nimrod-data-downloader --help
```

Alternatively, if you cloned the Git repository or downloaded from an archive:

```bash
cd path/to/nimrod-data-downloader;
node src/index.mjs --help
```

For the rest of this guide, the `npm` installation method will be assumed. If you're using the archive download / git clone method instead, then you should replace `nimrod-data-downloader` with `node src/index.mjs` after changing directory to the root of this repository.

### Step 1: Configuration
The nimrod data downloader uses a [toml](https://toml.io/en/) configuration file. This file contains the FTP credentials to connect with, and the area to extract. Here's an example configuration file (inline comments explain each of the settings):

```toml
# Example nimrod-data-downloader settings file
# See more information at https://github.com/sbrl/nimrod-data-downloader.git

# The absolute path to the directory to save the output to.
# Here an example for Linux is shown. Windows users will need to use something
# like 'Z:/Absolute/Path/to/Directory', for example
output = "/absolute/path/to/directory"

[ftp]
# The FTP username to use. This should be your CEDA username.
username = "YOUR_CEDA_USERNAME_HERE"
# The FTP password to use. This should be your CEDA password.
password = "YOUR_CEDA_PASSWORD_HERE"


[parsing]

[parsing.bounds]
    # The top-left point of the bounding box to extract. This should be in
    # latitude / longitude, but **the data is on the ordnance survey national grid**, and **these points will be converted to the OS national grid**. 
	top_left =		{ latitude = 54.3646, longitude = -1.3788 }
    # The bottom-right point of the bounding box to extract. See the note above
    # for the top-left point about the OS mational grid.
	bottom_right =	{ latitude = 53.0940, longitude = 0.5933 }
```

This file should be saved with the file extension `.toml`, and shouldn't contain spaces. For example, you could save it with the name `settings.custom.toml`.

It's very important to note that the nimrod rainfall radar data is on the **ordnance survey national grid**. The latitude / longitude points above are **converted to the OS national grid**, and the **final output data of the program is also on the OS national grid**, as the projections are different, making conversion extremely difficult.


### Step 2: Downloading the data
To download a defined area, do this:

```bash
nimrod-data-downloader download --config "path/to/settings.custom.toml"
```

The `path/to/settings.custom.toml` there should be the path to the configuration file to read that you created in step 1.

This process will take a while (it was observed in testing that several hours were needed), so it is suggested this is done overnight. It is also suggested that if you're connected over SSH that you use GNU screen to run the program. If you have it installed, do this _before_ executing the above command:

```bash
screen -R screen_session_name
```

...changing `screen_session_name` to be something meaningful (e.g. on a multi-user system you should include your name).


### Step 3: Finalising
After the download process is complete, the downloaded content must be finalised. This is done by executing the generated shell script. To do so, `cd` to the output directory and execute the script:

```bash
cd path/to/output_directory;
./postprocess.sh
```

This may take a few minutes to complete. Once done, a single `nimrod_ceda.jsonstream.gz` file will be generated.

Once you have verified the existence of the `nimrod_ceda.jsonstream.gz` file, then everything else in the output directory can be safely deleted.


## File format
This program converts the propriety binary format the nimrod rainfall radar data is stored in (which is actually very difficult to parse, as no only are there 3 different versions of the standard, some files are corrupt for no apparent reason) into a gzipped stream of JSON objects - with 1 JSON object per line (lines are separated with the newline `\n` separator).

It may be expected that these JSON objects are in chronological order. Here's an example JSON object:

```json
{
	"data": [.....],
	"timestamp": "2006-01-01T00:00:00.000Z",
	"timestamps": [
		"2006-01-01T00:00:00.000Z",
		"2006-01-01T00:00:00.000Z"
	],
	"size_full": {
		"width": 2175,
		"height": 1725
	},
	"size_extract": {
		"width": 174,
		"height": 105
	},
	"bounds_full": {
		"top_left": {
			"northing": 1550000,
			"easting": -405000
		},
		"top_right": {
			"northing": 1550000,
			"easting": 1320000
		},
		"bottom_right": {
			"northing": -625000,
			"easting": 1320000
		},
		"bottom_left": {
			"northing": -625000,
			"easting": -405000
		},
		"top": 1550000,
		"bottom": -625000,
		"left": -405000,
		"right": 1320000
	},
	"bounds_extract": {
		"top_left": {
			"latitude": 54.3646,
			"longitude": -1.3788
		},
		"bottom_right": {
			"latitude": 53.094,
			"longitude": 0.5933
		},
		"top_left_os": {
			"northing": 440461.4759806193,
			"easting": 496742.2040193061
		},
		"bottom_right_os": {
			"northing": 573745.0306883563,
			"easting": 358341.8077033124
		}
	},
	"bounds_extract_array": {
		"start": {
			"x": 962,
			"y": 774
		},
		"end": {
			"x": 1136,
			"y": 879
		}
	},
	"count_total": 3751875,
	"count_extract": 18270
}
```

Some of the properties and values above are ambiguous. To this end, they are documented in more detail below.

**NOTE: Please read the caveats below if you are handling with the JSON directly. You may get very confused otherwise.**

 - `data`: An array of arrays, containing the absolute rainfall values for the individual cells in mm/hr (note: the raw data is stored in `mm/hr*32`, but the values are divided by 32 to account for this). Values are floating-point numbers. The top-left / north-west corner is element `[0][0]` - **after a 90° transpose anti-clockwise** (see the caveats below).
 - `timestamp`: An ISO timestamp representing the time data was recorded
 - `timestamps`: The raw data actually has 2 timestamps, not 1 - but 1 of them is sometimes invalid. This array of strings contains both formatted as ISO timestamps.
 - `size_full`: This is the width / height of the _full_ area represented by the binary file from which this this slice was extracted.
 - `size_extract`: The width / height of the area that was extracted. Should match the `data` array-of-array's dimensions **after a 90° transpose anti-clockwise** (see the caveats below).
 - `bounds_full`: The bounding points of the entire content of the binary file from which this slice was extracted, on the OS national grid (northing / easting).
     - `top_left`: The top-left / north-west point
     - `top_right`: The top-right / north-east point
     - `bottom_right`: The bottom-right / south-east point
     - `bottom_left`: The bottom-left / south-west point
     - `top`: The northern-most bound
     - `left`: The western-most bound
     - `right`: The eastern-most bound
     - `bottom`: The southern-most bound
 - `bounds_extract`: The bounding points of the extracted area.
     - `top_left`: The top-left / north-west point (latitude / longitude)
     - `bottom_right`: The bottom-right / south-east point (latitude / longitude)
     - `top_left_os`: The top-left / north-west point (OS national grid)
     - `bottom_right_os`: The bottom-right / south-east point (OS national grid)
 - `bounds_extract_array`: The binary data is first converted to 1 big array of arrays beforee the slice is extracted. This contains debugging information about where the slice that was extract was in the source data.
     - `start`: The x/y indexes top-left corner of the data extracted in the source data
     - `end`: The x/y indexes of the bottom-right corner of the data extracted in the source data
 - `count_total`: The total number of individual data points in the source array of arrays
 - `count_extract`: The total number of individual data points in the extract array of arrays.


### Caveats
The format of the data should be fairly easy to handle, but it's very important to note some caveats that will leave you very confused if you don't read this section.

 - The content of the array-of-arrays `data` property is rotated by 90° clockwise. To fix this, the data must be transposed 90° **anti-**clockwise. See `docs/transpose.mjs` in this repository for an example of how this is done.


## Contributing
Contributions are welcome! If you've found a bug, please [open an issue](https://github.com/sbrl/nimrod-data-downloader/issues/new).

Even better, please open a pull request :D

Don't forget to mention in the pull request text that you release your contribution under the Mozilla Public License 2.0 though, because otherwise I will unfortunately be unable to accept your pull request.

Please remember that that since the licence on the nimrod rainfall radar data is so restrictive, I may not have access to it when you open your issue or pull request. I expect to have access until August 2022 (which is when my PhD ends).


## Licence
This program is released under the Mozilla Public License 2.0. The full license text is included in the `LICENSE` file in this repository. Tldr legal have a [great summary](https://tldrlegal.com/license/mozilla-public-license-2.0-(mpl-2)) of the license you should read.
