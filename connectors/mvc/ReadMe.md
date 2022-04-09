# Filemanager ASP.NET MVC Connector #

Filemanager connector for use with ASP.NET MVC.

## Supported Capabilities ##

The MVC connector currently supports these functions:

* select
* download
* rename
* delete
* replace
* move

## Unsupported Capabilities ##

These functions have currently not been implemented in the MVC connector:

* edit (text files)
* zip folder download
* excluding files/folders

## Setup ##

Follow these steps to use the MVC connector

### Step 1 ###

Set configuration settings appropriately in FilemanagerConfig.cs. 

### Step 2 ###

Make sure a route is set up to the Filemanager controller. This can be done in Global.asax, an area registration, or any other way that you create routes in your MVC project. E.g.:

~~~~
routes.MapRoute(
    "Filemanager_connector",
    "Filemanager/Index",
    new { controller = "Filemanager", action = "Index" },
    new string[] { "Filemanager" }
);
~~~~

### Step 3 ###

Set the "fileConnector" setting in filemanager.config.json to use the route to your connector. E.g.:

~~~~
{
  "options": {
    "fileConnector": "/Filemanager/Index",
	...
~~~~