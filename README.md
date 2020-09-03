# nimrod-data-downloader

> Data downloader for the 1km NIMROD rainfall radar data

This package downloads 1km NIMROD rainfall radar data, extracting the data within the given bounding box. It does so in a parallel fashion - it can take advantage of as many cores as your machine has.

I implemented this as part of my PhD.

## System Requirements
 - _Lots_ of disk space (extra space is needed to work in while downloading the data; heavy IO is performed too, so a fast disk will yield benefits)
 - As many CPU cores as you can manage (the process is really rather CPU intensive)
 - [Node.js](https://nodejs.org/)
 - Windows users will need [Git Bash](https://git-scm.com/downloads) installed to run the post-downloader script


## Installation
Install the npm package:

```bash
npm install --global nimrod-data-downloader # It hasn't been published yet, but it will be
```

## Usage
The downloader performs the following steps:

1. Download each file in turn
2. Pass off downloaded files to worker processes
3. Worker processes parse the file and write the result as a `.json.gz` file to the output directory
4. A Bash script is generated and written to the output directory which finalises the downloaded data

The Bash script must be run manually (see below).


TODO: Finish writing this section


## Licence
This program is released under the Mozilla Public License 2.0. The full license text is included in the `LICENSE` file in this repository. Tldr legal have a [great summary](https://tldrlegal.com/license/mozilla-public-license-2.0-(mpl-2)) of the license you should read.
