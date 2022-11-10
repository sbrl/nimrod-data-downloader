# nimrod-data-downloader

> Data downloader for the 1km NIMROD rainfall radar data

This package downloads **1km** NIMROD rainfall radar data (5km has not been tested), extracting the data within the given bounding box. It does so in a parallel fashion - it can take advantage of as many cores as your machine has.

I implemented this as part of my PhD.

 - **Current version:** ![current npm version - see the GitHub releases](https://img.shields.io/npm/v/nimrod-data-downloader)
 - **Changelog:** <https://github.com/sbrl/nimrod-data-downloader/blob/master/Changelog.md>


## System (and User) Requirements
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
This program has 2 subcommands:

Subcommand      | Purpose                       | Link to tutorial
----------------|-------------------------------|----------------------------
`download`      | Downloads the 1km rainfall radar data from the server | [`docs/usage-downloader.md`](https://github.com/sbrl/nimrod-data-downloader/blob/master/docs/usage-downloader.md)
`radar2caesar`  | Converts downloaded data to a format that CAESAR-Lisflood understands. | [`docs/usage-radar2caesar.md`](https://github.com/sbrl/nimrod-data-downloader/blob/master/docs/usage-radar2caesar.md)
`radar2png`		| Converts downloaded data into a series of timestamped PNG images | (coming soon)


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

**As of v1.3, the format has changed slightly. The new version is shown above. [See the old version here](https://github.com/sbrl/nimrod-data-downloader/tree/da38111d1e1cd15c8f694e5552c14465972c00bf#file-format).**

Some of the properties and values above are ambiguous. To this end, they are documented in more detail below.

**NOTE: Please read the caveats below if you are handling with the JSON directly. You may get very confused otherwise.**

 - `data`: An array of arrays, containing the absolute rainfall values for the individual cells in mm/hr (note: the raw data is stored in `mm/hr*32`, but the values are divided by 32 to account for this). Values are floating-point numbers. The top-left / north-west corner is element `[0][0]` - **after a 90° transpose anti-clockwise** (see the caveats below).
 - `timestamp`: An ISO timestamp representing the time data was recorded
 - `timestamps`: The raw data actually has 2 timestamps, not 1 - but 1 of them is sometimes invalid. This array of strings contains both formatted as ISO timestamps.
 - `size_full`: This is the width / height of the _full_ area represented by the binary file from which this this slice was extracted.
 - `size`: The width / height of the area that was extracted. Should match the `data` array-of-array's dimensions **after a 90° transpose anti-clockwise** (see the caveats below).
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
 - `count_total`: The total number of individual data points in the source array of arrays
 - `count`: The total number of individual data points in the extract array of arrays.


**The following properties are not available if you do not specify a area to extract:**

 - `bounds_extract`
 - `bounds_full`: Available, but looks different

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
