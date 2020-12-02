# Using the Downloader
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

This may take a few minutes to complete. Once done, a single `nimrod_ceda.jsonl.gz` file will be generated.

Once you have verified the existence of the `nimrod_ceda.jsonl.gz` file, then everything else in the output directory can be safely deleted.
