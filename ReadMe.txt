Installation and Setup
----------------------

(1) Check out a copy of the FileManager from the repository using Git :

git clone http://github.com/simogeo/Filemanager.git

or download the archive from Github : http://github.com/simogeo/Filemanager/archives/master

You can place the FileManager anywhere within your web serving root directory.

(2) Make a copy of the default configuration file ("filemanager.config.js.default" located in the scripts directory), removing the '.default' from the end of the filename, and edit the options according to the comments in the file.

(3) Find the default configuration file for the connector you chose in Step 2 above, and follow the same procedure to configure the connector. For instance, the default configuration file for the PHP connector is located here:
    Currently, PHP and JSP connectors are available for Filemanager, but we are waiting for you contributions
    
[Path to FileManager]/connectors/php/filemanager.config.inc.default

(4a) If you are integrating the FileManager with FCKEditor, open your fckconfig.js file and find the lines which specify what file browser to use for images, links, etc. Look toward the bottom of the file. You will need to change lines such as this:

FCKConfig.ImageBrowser = false ;
FCKConfig.ImageBrowserURL = FCKConfig.BasePath + 'filemanager/browser/default/browser.html?Type=Image&Connector=../../connectors/' + _FileBrowserLanguage + '/connector.' + _FileBrowserExtension ;

...to this:

FCKConfig.ImageBrowser = true ;
FCKConfig.ImageBrowserURL = '[Path to Filemanager]/index.html' ;

(4b) If you are integrating the FileManager with CKEditor 3.x or higher, simply set the URL when you configure your instance, like so:

CKEDITOR.replace('instancename', {
	filebrowserBrowseUrl: '[Path to Filemanager]/index.html',
	...other configuration options...
});

(4c) If you are integrating the FileManager with TinyMCE (>= 3.0), you should:

Create a Javascript callback function that will open the FileManager index.html base page (see URL below for examples)
Add a line like: "file_browser_callback : 'name_of_callback_function'" in the tinyMCE.init command
See http://wiki.moxiecode.com/index.php/TinyMCE:Custom_filebrowser for more details.


API
---


Connector Location
------------------
You can create a connector for your server side language of choice by following this simple API. You must have a script at the following location which can respond to HTTP GET requests by returning an appropriate JSON object:

	[path to FileManager]/connectors/[language extension]/filemanager.[language extension]

FileManager currently includes connectors for PHP, JSP and CFM in the following locations:

	PHP: .../connectors/php/filemanager.php
	JSP: .../connectors/jsp/filemanager.jsp
	CFM: .../connectors/cfm/filemanager.cfm

As long as a script exists at this location to respond to requests, you may split up the code (external libraries, configuration files, etc.) however you see fit.


Error Handling
--------------
Every response should include two keys specific to error handling: Error, and Code. If an error occurs in your script, you may populate these keys with whatever values you feel are most appropriate. If there is no error, Error should remain empty or null, and Code should be empty, null, or zero (0). Do not use zero for any actual errors. The following example would be an appropriate response if the connector uses an external file for configuration (recommended), but that file cannot be found:

	{
		"Error": "Configuration file missing.",
		"Code":  -1
	}


Methods
-------
Your script should include support for the following methods/functions. GET requests from FileManager include a parameter "mode" which will indicate which type of response to return. Additional parameters will provide other information required to fulfill the request, such as the current directory.

getinfo
-------
The getinfo method returns information about a single file. Requests with mode "getinfo" will include an additional parameter, "path", indicating which file to inspect. A boolean parameter "getsize" indicates whether the dimensions of the file (if an image) should be returned. 

Example Request:

	[path to connector]?mode=getinfo&path=/UserFiles/Image/logo.png&getsize=true

Example Response:

	{
		"Path": "/UserFiles/Image/logo.png",
		"Filename": "logo.png",
		"File Type": "png",
		"Preview": "/UserFiles/Image/logo.png",
		"Properties": {
			"Date Created": null, 
			"Date Modified": "02/09/2007 14:01:06", 
			"Height": 14,
			"Width": 14,
			"Size": 384 
		},
		"Error": "",
		"Code": 0
	}

The keys are as follows:

	Path: The path to the file. Should match what was passed in the request.

	Filename: The name of the file, i.e., the last part of the path.

	File Type: The file extension, "dir" if a directory, or "txt" if missing/unknown.

	Preview: Path to a preview image. If the file is an image that can be displayed in a web browser (i.e., gif, jpg, or png), you should return the path to the image. Otherwise, check to see if there is a matching file icon based on the file extension, constructing the path like so:
	
		Directories: images/fileicons/_Open.png		
		Files: images/fileicons/[extension].png		
		Unknown: images/fileicons/default.png
	
	Properties: A nested JSON object containing specific properties of the file.
	
		Date Created: The file's creation date, if available.
		Date Modified: The file's modification date, if available.
		Height: If an image, the height in pixels.
		Width: If an image, the width in pixels.
		Size: The file size in bytes.
	
	Error: An error message, or empty/null if there was no error.
	
	Code: An error code, or 0 if there was no error.


getfolder
---------
The getfolder method returns an array of file and folder objects representing the contents of the given directory (indicated by a "path" parameter). It should call the getinfo method to retrieve the properties of each file. A boolean parameter "getsizes" indicates whether image dimensions should be returned for each item. Folders should always be returned before files.
Optionally a "type" parameter can be specified to restrict returned files (depending on the connector). If a "type" parameter is given for the main index.html URL, the same parameter value is reused and passed to getfolder. This can be used for example to only show image files in a file system tree.

Example Request:

	[path to connector]?mode=getfolder&path=/UserFiles/Image/&getsizes=true&type=images

Example Response:

	{
		"/UserFiles/Image/logo.png": {
			"Path": "/UserFiles/Image/logo.png",
			"Filename": "logo.png",
			"File Type": "png",
			"Preview": "/UserFiles/Image/logo.png",
			"Properties": {
				"Date Created": null, 
				"Date Modified": "02/09/2007 14:01:06", 
				"Height": 14,
				"Width": 14,
				"Size": 384 
			},
			"Error": "",
			"Code": 0	
		},
		"/UserFiles/Image/icon.png": {
			"Path": "/UserFiles/Image/icon.png",
			"Filename": "icon.png",
			"File Type": "png",
			"Preview": "/UserFiles/Image/icon.png",
			"Properties": {
				"Date Created": null, 
				"Date Modified": "02/09/2007 14:01:06", 
				"Height": 14,
				"Width": 14,
				"Size": 384 
			},
			"Error": "",
			"Code": 0	
		}		
	}

Each key in the array is the path to an individual item, and the value is the file object for that item.


rename
------
The rename method renames the item at the path given in the "old" parameter with the name given in the "new" parameter and returns an object indicating the results of that action.

Example Request:

	[path to connector]?mode=rename&old=/UserFiles/Image/logo.png&new=id.png

Example Response:

{
	"Error": "No error",
	"Code": 0,
	"Old Path": "/a_folder_renamed/thisisareallylongincrediblylongfilenamefortesting.txt",
	"Old Name": "thisisareallylongincrediblylongfilenamefortesting.txt",
	"New Path": "/a_folder_renamed/a_renamed_file", 
	"New Name": "a_renamed_file"
}


delete
------
The delete method deletes the item at the given path.

Example Request:

	[path to connector]?mode=delete&path=/UserFiles/Image/logo.png

Example Response:

{
	"Error": "No error",
	"Code": 0,
	"Path": "/UserFiles/Image/logo.png"
}


add
---
The add method adds the uploaded file to the specified path. Unlike the other methods, this method must return its JSON response wrapped in an HTML <textarea>, so the MIME type of the response is text/html instead of text/plain. The upload form in the File Manager passes the current path as a POST param along with the uploaded file. The response includes the path as well as the name used to store the file. The uploaded file's name should be safe to use as a path component in a URL, so URL-encoded at a minimum.

Example Response:

{
	"Path": "/UserFiles/Image/",
	"Name": "new_logo.png",
	"Error": "No error",
	"Code": 0
}


addfolder
---------
The addfolder method creates a new directory on the server within the given path.

Example Request:

	[path to connector]?mode=addfolder&path=/UserFiles/&name=new%20logo.png
	
Example Response:

{
	"Parent": "/UserFiles/",
	"Name": "new_logo.png",
	"Error": "No error",
	"Code": 0
}


download
--------
The download method serves the requested file to the user. We currently use a MIME type of "application/x-download" to force the file to be downloaded rather than displayed in a browser. In the future we may make exceptions for specific file types that often have in-browser viewers such as PDF's and various movie formats (Flash, Quicktime, etc.).

Example Request:

	[path to connector]?mode=download&path=/UserFiles/new%20logo.png
