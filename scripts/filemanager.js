/**
 *	Filemanager JS core
 *
 *	filemanager.js
 *
 *	@license	MIT License
 *	@author		Jason Huck - Core Five Labs
 *	@author		Simon Georget <simon (at) linea21 (dot) com>
 *	@copyright	Authors
 */

(function($) {
 
// function to retrieve GET params
$.urlParam = function(name){
	var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
	if (results)
		return results[1]; 
	else
		return 0;
}

/*---------------------------------------------------------
  Setup, Layout, and Status Functions
---------------------------------------------------------*/

// Sets paths to connectors based on language selection.
var fileConnector = 'connectors/' + lang + '/filemanager.' + lang;

var capabilities = new Array('select', 'download', 'rename', 'delete');

// Get localized messages from file 
// through culture var or from URL
if($.urlParam('langCode') != 0 && file_exists ('scripts/languages/'  + $.urlParam('langCode') + '.js')) culture = $.urlParam('langCode');
var lg = [];
$.ajax({
  url: 'scripts/languages/'  + culture + '.js',
  async: false,
  dataType: 'json',
  success: function (json) {
    lg = json;
  }
});

// Options for alert, prompt, and confirm dialogues.
$.prompt.setDefaults({
    overlayspeed: 'fast',
    show: 'fadeIn',
    opacity: 0.4
});

// Forces columns to fill the layout vertically.
// Called on initial page load and on resize.
var setDimensions = function(){
	var newH = $(window).height() - $('#uploader').height() - 30;	
	$('#splitter, #filetree, #fileinfo, .vsplitbar').height(newH);
}

// Display Min Path
var displayPath = function(path) {
	if(showFullPath == false)
		return path.replace(fileRoot, "/");
	else 
		return path;
}

// Set the view buttons state
var setViewButtonsFor = function(viewMode) {
    if (viewMode == 'grid') {
        $('#grid').addClass('ON');
        $('#list').removeClass('ON');
    }
    else {
        $('#list').addClass('ON');
        $('#grid').removeClass('ON');
    }
}

// Test if a given url exists
function file_exists (url) {
    // http://kevin.vanzonneveld.net
    // +   original by: Enrique Gonzalez
    // +      input by: Jani Hartikainen
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // %        note 1: This function uses XmlHttpRequest and cannot retrieve resource from different domain.
    // %        note 1: Synchronous so may lock up browser, mainly here for study purposes. 
    // *     example 1: file_exists('http://kevin.vanzonneveld.net/pj_test_supportfile_1.htm');
    // *     returns 1: '123'
    var req = this.window.ActiveXObject ? new ActiveXObject("Microsoft.XMLHTTP") : new XMLHttpRequest();
    if (!req) {
        throw new Error('XMLHttpRequest not supported');
    }

    // HEAD Results are usually shorter (faster) than GET
    req.open('HEAD', url, false);
    req.send(null);
    if (req.status == 200) {
        return true;
    }

    return false;
}

// preg_replace
// Code from : http://xuxu.fr/2006/05/20/preg-replace-javascript/
var preg_replace = function(array_pattern, array_pattern_replace, str)  {
	var new_str = String (str);
		for (i=0; i<array_pattern.length; i++) {
			var reg_exp= RegExp(array_pattern[i], "g");
			var val_to_replace = array_pattern_replace[i];
			new_str = new_str.replace (reg_exp, val_to_replace);
		}
		return new_str;
	}

// cleanString (), on the same model as server side (connector)
// cleanString
var cleanString = function(str) {
	var cleaned = "";
	var p_search  = 	new Array("Š", "š", "Đ", "đ", "Ž", "ž", "Č", "č", "Ć", "ć", "À", 
						"Á", "Â", "Ã", "Ä", "Å", "Æ", "Ç", "È", "É", "Ê", "Ë", "Ì", "Í", "Î", "Ï", 
						"Ñ", "Ò", "Ó", "Ô", "Õ", "Ö", "Ő", "Ø", "Ù", "Ú", "Û", "Ü", "Ý", "Þ", "ß", 
						"à", "á", "â", "ã", "ä", "å", "æ", "ç", "è", "é", "ê", "ë", "ì",  "í",  
						"î", "ï", "ð", "ñ", "ò", "ó", "ô", "õ", "ö", "ő", "ø", "ù", "ú", "û", "ý", 
						"ý", "þ", "ÿ", "Ŕ", "ŕ", " ", "'", "/"
						);
	var p_replace = 	new Array("S", "s", "Dj", "dj", "Z", "z", "C", "c", "C", "c", "A", 
						"A", "A", "A", "A", "A", "A", "C", "E", "E", "E", "E", "I", "I", "I", "I", 
						"N", "O", "O", "O", "O", "O", "O", "O", "U", "U", "U", "U", "Y", "B", "Ss", 
						"a", "a", "a", "a", "a", "a", "a", "c", "e", "e", "e", "e", "i", "i",
						"i", "i", "o", "n", "o", "o", "o", "o", "o", "o", "o", "u", "u", "u", "y", 
						"y", "b", "y", "R", "r", "_", "_", ""
					);

	cleaned = preg_replace(p_search, p_replace, str);
	cleaned = cleaned.replace(/[^_a-zA-Z0-9]/g, "");
	cleaned = cleaned.replace(/[_]+/g, "_");
	
	return cleaned;
}

// nameFormat (), separate filename from extension before calling cleanString()
// nameFormat
var nameFormat = function(input) {
	filename = '';
	if(input.lastIndexOf('.') != -1) {
		filename  = cleanString(input.substr(0, input.lastIndexOf('.')));
		filename += '.' + input.split('.').pop();
	} else {
		filename = cleanString(input);
	}
	return filename;
}


// Handle Error. Freeze interactive buttons and display
// error message. Also called when auth() function return false (Code == "-1")
var handleError = function(errMsg) {
	$('#fileinfo').html('<h1>' + errMsg+ '</h1>');
	$('#newfile').attr("disabled", "disabled");
	$('#upload').attr("disabled", "disabled");
	$('#newfolder').attr("disabled", "disabled");
}

// Test if Data structure has the 'cap' capability
// 'cap' is one of 'select', 'rename', 'delete', 'download'
function has_capability(data, cap) {
	if (data['File Type'] == 'dir' && cap == 'download') return false;
	if (typeof(data['Capabilities']) == "undefined") return true;
	else return $.inArray(cap, data['Capabilities']) > -1;
}

// from http://phpjs.org/functions/basename:360
var basename = function(path, suffix) {
    var b = path.replace(/^.*[\/\\]/g, '');

    if (typeof(suffix) == 'string' && b.substr(b.length-suffix.length) == suffix) {
        b = b.substr(0, b.length-suffix.length);
    }
    
    return b;
}

// Sets the folder status, upload, and new folder functions 
// to the path specified. Called on initial page load and 
// whenever a new directory is selected.
var setUploader = function(path){
	$('#currentpath').val(path);
	$('#uploader h1').text(lg.current_folder + displayPath(path));

	$('#newfolder').unbind().click(function(){
		var foldername =  lg.default_foldername;
		var msg = lg.prompt_foldername + ' : <input id="fname" name="fname" type="text" value="' + foldername + '" />';
		
		var getFolderName = function(v, m){
			if(v != 1) return false;		
			var fname = m.children('#fname').val();		

			if(fname != ''){
				foldername = cleanString(fname);
				var d = new Date(); // to prevent IE cache issues
				$.getJSON(fileConnector + '?mode=addfolder&path=' + $('#currentpath').val() + '&name=' + foldername + '&time=' + d.getMilliseconds(), function(result){
					if(result['Code'] == 0){
						addFolder(result['Parent'], result['Name']);
						getFolderInfo(result['Parent']);
					} else {
						$.prompt(result['Error']);
					}				
				});
			} else {
				$.prompt(lg.no_foldername);
			}
		}
		var btns = {}; 
		btns[lg.create_folder] = true; 
		btns[lg.cancel] = false; 
		$.prompt(msg, {
			callback: getFolderName,
			buttons: btns 
		});	
	});	
}

// Binds specific actions to the toolbar in detail views.
// Called when detail views are loaded.
var bindToolbar = function(data){
	// this little bit is purely cosmetic
	$('#fileinfo').find('button').wrapInner('<span></span>');

	if (!has_capability(data, 'select')) {
		$('#fileinfo').find('button#select').hide();
	} else {
		$('#fileinfo').find('button#select').click(function(){
			selectItem(data);
		}).show();
	}
	
	if (!has_capability(data, 'rename')) {
		$('#fileinfo').find('button#rename').hide();
	} else {
		$('#fileinfo').find('button#rename').click(function(){
			var newName = renameItem(data);
			if(newName.length) $('#fileinfo > h1').text(newName);
		}).show();
	}

	if (!has_capability(data, 'delete')) {
		$('#fileinfo').find('button#delete').hide();
	} else {
		$('#fileinfo').find('button#delete').click(function(){
			if(deleteItem(data)) $('#fileinfo').html('<h1>' + lg.select_from_left + '</h1>');
		}).show();
	}

	if (!has_capability(data, 'download')) {
		$('#fileinfo').find('button#download').hide();
	} else {
		$('#fileinfo').find('button#download').click(function(){
			window.location = fileConnector + '?mode=download&path=' + encodeURIComponent(data['Path']);
		}).show();
	}
}

// Converts bytes to kb, mb, or gb as needed for display.
var formatBytes = function(bytes){
	var n = parseFloat(bytes);
	var d = parseFloat(1024);
	var c = 0;
	var u = [lg.bytes,lg.kb,lg.mb,lg.gb];
	
	while(true){
		if(n < d){
			n = Math.round(n * 100) / 100;
			return n + u[c];
		} else {
			n /= d;
			c += 1;
		}
	}
}


/*---------------------------------------------------------
  Item Actions
---------------------------------------------------------*/

// Calls the SetUrl function for FCKEditor compatibility,
// passes file path, dimensions, and alt text back to the
// opening window. Triggered by clicking the "Select" 
// button in detail views or choosing the "Select"
// contextual menu option in list views. 
// NOTE: closes the window when finished.
var selectItem = function(data){
    var url = relPath + data['Path'];
    
	if(window.opener){
	 	if(window.tinyMCEPopup){
        	// use TinyMCE > 3.0 integration method
            var win = tinyMCEPopup.getWindowArg("window");
			win.document.getElementById(tinyMCEPopup.getWindowArg("input")).value = url;
            if (typeof(win.ImageDialog) != "undefined") {
				// Update image dimensions
            	if (win.ImageDialog.getImageData)
                 	win.ImageDialog.getImageData();

                // Preview if necessary
                if (win.ImageDialog.showPreviewImage)
					win.ImageDialog.showPreviewImage(url);
			}
			tinyMCEPopup.close();
			return;
		}
		if($.urlParam('CKEditor')){
			// use CKEditor 3.0 integration method
			window.opener.CKEDITOR.tools.callFunction($.urlParam('CKEditorFuncNum'), url);
		} else {
			// use FCKEditor 2.0 integration method
			if(data['Properties']['Width'] != ''){
				var p = url;
				var w = data['Properties']['Width'];
				var h = data['Properties']['Height'];			
				window.opener.SetUrl(p,w,h);
			} else {
				window.opener.SetUrl(url);
			}		
		}

		window.close();
	} else {
		$.prompt(lg.fck_select_integration);
	}
}

// Renames the current item and returns the new name.
// Called by clicking the "Rename" button in detail views
// or choosing the "Rename" contextual menu option in 
// list views.
var renameItem = function(data){
	var finalName = '';
	var msg = lg.new_filename + ' : <input id="rname" name="rname" type="text" value="' + data['Filename'] + '" />';

	var getNewName = function(v, m){
		if(v != 1) return false;
		rname = m.children('#rname').val();
		
		if(rname != ''){
			var givenName = nameFormat(rname);	
			var oldPath = data['Path'];	
			var connectString = fileConnector + '?mode=rename&old=' + data['Path'] + '&new=' + givenName;
		
			$.ajax({
				type: 'GET',
				url: connectString,
				dataType: 'json',
				async: false,
				success: function(result){
					if(result['Code'] == 0){
						var newPath = result['New Path'];
						var newName = result['New Name'];
	
						updateNode(oldPath, newPath, newName);
						
						var title = $("#preview h1").attr("title");

						if (typeof title !="undefined" && title == oldPath) {
							$('#preview h1').text(newName);
						}
						
						if($('#fileinfo').data('view') == 'grid'){
							$('#fileinfo img[alt="' + oldPath + '"]').parent().next('p').text(newName);
							$('#fileinfo img[alt="' + oldPath + '"]').attr('alt', newPath);
						} else {
							$('#fileinfo td[title="' + oldPath + '"]').text(newName);
							$('#fileinfo td[title="' + oldPath + '"]').attr('title', newPath);
						}
										
						$.prompt(lg.successful_rename);
					} else {
						$.prompt(result['Error']);
					}
					
					finalName = result['New Name'];		
				}
			});	
		}
	}
	var btns = {}; 
	btns[lg.rename] = true; 
	btns[lg.cancel] = false; 
	$.prompt(msg, {
		callback: getNewName,
		buttons: btns 
	});
	
	return finalName;
}

// Prompts for confirmation, then deletes the current item.
// Called by clicking the "Delete" button in detail views
// or choosing the "Delete contextual menu item in list views.
var deleteItem = function(data){
	var isDeleted = false;
	var msg = lg.confirmation_delete;
	
	var doDelete = function(v, m){
		if(v != 1) return false;	
		var connectString = fileConnector + '?mode=delete&path=' + encodeURIComponent(data['Path']);
	
		$.ajax({
			type: 'GET',
			url: connectString,
			dataType: 'json',
			async: false,
			success: function(result){
				if(result['Code'] == 0){
					removeNode(result['Path']);
					var rootpath = result['Path'].substring(0, result['Path'].length-1); // removing the last slash
					rootpath = rootpath.substr(0, rootpath.lastIndexOf('/') + 1);
					$('#uploader h1').text(lg.current_folder + displayPath(rootpath));
					isDeleted = true;
					$.prompt(lg.successful_delete);
				} else {
					isDeleted = false;
					$.prompt(result['Error']);
				}			
			}
		});	
	}
	var btns = {}; 
	btns[lg.yes] = true; 
	btns[lg.no] = false; 
	$.prompt(msg, {
		callback: doDelete,
		buttons: btns 
	});
	
	return isDeleted;
}


/*---------------------------------------------------------
  Functions to Update the File Tree
---------------------------------------------------------*/

// Adds a new node as the first item beneath the specified
// parent node. Called after a successful file upload.
var addNode = function(path, name){
	var ext = name.substr(name.lastIndexOf('.') + 1);
	var thisNode = $('#filetree').find('a[rel="' + path + '"]');
	var parentNode = thisNode.parent();
	var newNode = '<li class="file ext_' + ext + '"><a rel="' + path + name + '" href="#">' + name + '</a></li>';
	
	if(!parentNode.find('ul').size()) parentNode.append('<ul></ul>');		
	parentNode.find('ul').prepend(newNode);
	thisNode.click().click();

	getFolderInfo(path);

	$.prompt(lg.successful_added_file);
}

// Updates the specified node with a new name. Called after
// a successful rename operation.
var updateNode = function(oldPath, newPath, newName){
	var thisNode = $('#filetree').find('a[rel="' + oldPath + '"]');
	var parentNode = thisNode.parent().parent().prev('a');
	thisNode.attr('rel', newPath).text(newName);
	parentNode.click().click();

}

// Removes the specified node. Called after a successful 
// delete operation.
var removeNode = function(path){
    $('#filetree')
        .find('a[rel="' + path + '"]')
        .parent()
        .fadeOut('slow', function(){ 
            $(this).remove();
        });
    // grid case
    if($('#fileinfo').data('view') == 'grid'){
        $('#contents img[alt="' + path + '"]').parent().parent()
            .fadeOut('slow', function(){ 
                $(this).remove();
        });
    }
    // list case
    else {
        $('table#contents')
            .find('td[title="' + path + '"]')
            .parent()
            .fadeOut('slow', function(){ 
                $(this).remove();
        });
    }
    // remove fileinfo when item to remove is currently selected
    if ($('#preview').length) {
    	getFolderInfo(path.substr(0, path.lastIndexOf('/') + 1));
	}
}


// Adds a new folder as the first item beneath the
// specified parent node. Called after a new folder is
// successfully created.
var addFolder = function(parent, name){
	var newNode = '<li class="directory collapsed"><a rel="' + parent + name + '/" href="#">' + name + '</a><ul class="jqueryFileTree" style="display: block;"></ul></li>';
	var parentNode = $('#filetree').find('a[rel="' + parent + '"]');
	if(parent != fileRoot){
		parentNode.next('ul').prepend(newNode).prev('a').click().click();
	} else {
		$('#filetree > ul').prepend(newNode); 
		$('#filetree').find('li a[rel="' + parent + name + '/"]').click(function(){
				getFolderInfo(parent + name + '/');
			}).each(function() {
				$(this).contextMenu(
					{ menu: getContextMenuOptions($(this)) }, 
					function(action, el, pos){
						var path = $(el).attr('rel');
						setMenus(action, path);
					});
				}
			);
	}
	
	$.prompt(lg.successful_added_folder);
}




/*---------------------------------------------------------
  Functions to Retrieve File and Folder Details
---------------------------------------------------------*/

// Decides whether to retrieve file or folder info based on
// the path provided.
var getDetailView = function(path){
	if(path.lastIndexOf('/') == path.length - 1){
		getFolderInfo(path);
		$('#filetree').find('a[rel="' + path + '"]').click();
	} else {
		getFileInfo(path);
	}
}

function getContextMenuOptions(elem) {
	var optionsID = elem.attr('class').replace(/ /g, '_');
	if (optionsID == "") return 'itemOptions';
	if (!($('#' + optionsID).length)) {
		// Create a clone to itemOptions with menus specific to this element
		var newOptions = $('#itemOptions').clone().attr('id', optionsID);
		if (!elem.hasClass('cap_select')) $('.select', newOptions).remove();
		if (!elem.hasClass('cap_download')) $('.download', newOptions).remove();
		if (!elem.hasClass('cap_rename')) $('.rename', newOptions).remove();
		if (!elem.hasClass('cap_delete')) $('.delete', newOptions).remove();
		$('#itemOptions').after(newOptions);
	}
	return optionsID;
}

// Binds contextual menus to items in list and grid views.
var setMenus = function(action, path){
	var d = new Date(); // to prevent IE cache issues
	$.getJSON(fileConnector + '?mode=getinfo&path=' + path + '&time=' + d.getMilliseconds(), function(data){
		if($('#fileinfo').data('view') == 'grid'){
			var item = $('#fileinfo').find('img[alt="' + data['Path'] + '"]').parent();
		} else {
			var item = $('#fileinfo').find('td[title="' + data['Path'] + '"]').parent();
		}
	
		switch(action){
			case 'select':
				selectItem(data);
				break;
			
			case 'download':
				window.location = fileConnector + '?mode=download&path=' + data['Path'];
				break;
				
			case 'rename':
				var newName = renameItem(data);
				break;
				
			case 'delete':
				deleteItem(data);
				break;
		}
	});
}

// Retrieves information about the specified file as a JSON
// object and uses that data to populate a template for
// detail views. Binds the toolbar for that detail view to
// enable specific actions. Called whenever an item is
// clicked in the file tree or list views.
var getFileInfo = function(file){
	// Update location for status, upload, & new folder functions.
	var currentpath = file.substr(0, file.lastIndexOf('/') + 1);
	setUploader(currentpath);

	// Include the template.
	var template = '<div id="preview"><img /><h1></h1><dl></dl></div>';
	template += '<form id="toolbar">';
	if(window.opener != null) template += '<button id="select" name="select" type="button" value="Select">' + lg.select + '</button>';
	template += '<button id="download" name="download" type="button" value="Download">' + lg.download + '</button>';
	if(browseOnly != true) template += '<button id="rename" name="rename" type="button" value="Rename">' + lg.rename + '</button>';
	if(browseOnly != true) template += '<button id="delete" name="delete" type="button" value="Delete">' + lg.del + '</button>';
	template += '<button id="parentfolder">' + lg.parentfolder + '</button>';
	template += '</form>';
	
	$('#fileinfo').html(template);
	$('#parentfolder').click(function() {getFolderInfo(currentpath);});
	
	// Retrieve the data & populate the template.
	var d = new Date(); // to prevent IE cache issues
	$.getJSON(fileConnector + '?mode=getinfo&path=' + encodeURIComponent(file) + '&time=' + d.getMilliseconds(), function(data){
		if(data['Code'] == 0){
			$('#fileinfo').find('h1').text(data['Filename']).attr('title', file);
			$('#fileinfo').find('img').attr('src',data['Preview']);
			
			var properties = '';
			
			if(data['Properties']['Width'] && data['Properties']['Width'] != '') properties += '<dt>' + lg.dimensions + '</dt><dd>' + data['Properties']['Width'] + 'x' + data['Properties']['Height'] + '</dd>';
			if(data['Properties']['Date Created'] && data['Properties']['Date Created'] != '') properties += '<dt>' + lg.created + '</dt><dd>' + data['Properties']['Date Created'] + '</dd>';
			if(data['Properties']['Date Modified'] && data['Properties']['Date Modified'] != '') properties += '<dt>' + lg.modified + '</dt><dd>' + data['Properties']['Date Modified'] + '</dd>';
			if(data['Properties']['Size'] || parseInt(data['Properties']['Size'])==0) properties += '<dt>' + lg.size + '</dt><dd>' + formatBytes(data['Properties']['Size']) + '</dd>';
			$('#fileinfo').find('dl').html(properties);
			
			// Bind toolbar functions.
			bindToolbar(data);
		} else {
			$.prompt(data['Error']);
		}
	});	
}

// Retrieves data for all items within the given folder and
// creates a list view. Binds contextual menu options.
// TODO: consider stylesheet switching to switch between grid
// and list views with sorting options.
var getFolderInfo = function(path){
	// Update location for status, upload, & new folder functions.
	setUploader(path);

	// Display an activity indicator.
	$('#fileinfo').html('<img id="activity" src="images/wait30trans.gif" width="30" height="30" />');

	// Retrieve the data and generate the markup.
	var d = new Date(); // to prevent IE cache issues
	var url = fileConnector + '?path=' + encodeURIComponent(path) + '&mode=getfolder&showThumbs=' + showThumbs + '&time=' + d.getMilliseconds();
	if ($.urlParam('type')) url += '&type=' + $.urlParam('type');
	$.getJSON(url, function(data){
		var result = '';
		
		// Is there any error or user is unauthorized?
		if(data.Code=='-1') {
			handleError(data.Error);
			return;
		};
		
		if(data){
			if($('#fileinfo').data('view') == 'grid'){
				result += '<ul id="contents" class="grid">';
				
				for(key in data){
					var props = data[key]['Properties'];
					var cap_classes = "";
					for (cap in capabilities) {
						if (has_capability(data[key], capabilities[cap])) {
							cap_classes += " cap_" + capabilities[cap];
						}
					}
				
					var scaledWidth = 64;
					var actualWidth = props['Width'];
					if(actualWidth > 1 && actualWidth < scaledWidth) scaledWidth = actualWidth;
				
					result += '<li class="' + cap_classes + '"><div class="clip"><img src="' + data[key]['Preview'] + '" width="' + scaledWidth + '" alt="' + data[key]['Path'] + '" /></div><p>' + data[key]['Filename'] + '</p>';
					if(props['Width'] && props['Width'] != '') result += '<span class="meta dimensions">' + props['Width'] + 'x' + props['Height'] + '</span>';
					if(props['Size'] && props['Size'] != '') result += '<span class="meta size">' + props['Size'] + '</span>';
					if(props['Date Created'] && props['Date Created'] != '') result += '<span class="meta created">' + props['Date Created'] + '</span>';
					if(props['Date Modified'] && props['Date Modified'] != '') result += '<span class="meta modified">' + props['Date Modified'] + '</span>';
					result += '</li>';
				}
				
				result += '</ul>';
			} else {
				result += '<table id="contents" class="list">';
				result += '<thead><tr><th class="headerSortDown"><span>' + lg.name + '</span></th><th><span>' + lg.dimensions + '</span></th><th><span>' + lg.size + '</span></th><th><span>' + lg.modified + '</span></th></tr></thead>';
				result += '<tbody>';
				
				for(key in data){
					var path = data[key]['Path'];
					var props = data[key]['Properties'];
					var cap_classes = "";
					for (cap in capabilities) {
						if (has_capability(data[key], capabilities[cap])) {
							cap_classes += " cap_" + capabilities[cap];
						}
					}
					result += '<tr class="' + cap_classes + '">';
					result += '<td title="' + path + '">' + data[key]['Filename'] + '</td>';

					if(props['Width'] && props['Width'] != ''){
						result += ('<td>' + props['Width'] + 'x' + props['Height'] + '</td>');
					} else {
						result += '<td></td>';
					}
					
					if(props['Size'] && props['Size'] != ''){
						result += '<td><abbr title="' + props['Size'] + '">' + formatBytes(props['Size']) + '</abbr></td>';
					} else {
						result += '<td></td>';
					}
					
					if(props['Date Modified'] && props['Date Modified'] != ''){
						result += '<td>' + props['Date Modified'] + '</td>';
					} else {
						result += '<td></td>';
					}
				
					result += '</tr>';					
				}
								
				result += '</tbody>';
				result += '</table>';
			}			
		} else {
			result += '<h1>' + lg.could_not_retrieve_folder + '</h1>';
		}
		
		// Add the new markup to the DOM.
		$('#fileinfo').html(result);
		
		// Bind click events to create detail views and add
		// contextual menu options.
		if($('#fileinfo').data('view') == 'grid'){
			$('#fileinfo').find('#contents li').click(function(){
				var path = $(this).find('img').attr('alt');
				getDetailView(path);
			}).each(function() {
				$(this).contextMenu(
					{ menu: getContextMenuOptions($(this)) },
					function(action, el, pos){
						var path = $(el).find('img').attr('alt');
						setMenus(action, path);
					}
				);
			});
		} else {
			$('#fileinfo').find('td:first-child').each(function(){
				var path = $(this).attr('title');
				var treenode = $('#filetree').find('a[rel="' + path + '"]').parent();
				$(this).css('background-image', treenode.css('background-image'));
			});
			
			$('#fileinfo tbody tr').click(function(){
				var path = $('td:first-child', this).attr('title');
				getDetailView(path);		
			}).each(function() {
				$(this).contextMenu(
					{ menu: getContextMenuOptions($(this)) },
					function(action, el, pos){
						var path = $('td:first-child', el).attr('title');
						setMenus(action, path);
					}
				);
			});
			
			$('#fileinfo').find('table').tablesorter({
				textExtraction: function(node){					
					if($(node).find('abbr').size()){
						return $(node).find('abbr').attr('title');
					} else {					
						return node.innerHTML;
					}
				}
			});
		}
	});
}

// Retrieve data (file/folder listing) for jqueryFileTree and pass the data back
// to the callback function in jqueryFileTree
var populateFileTree = function(path, callback){
	var d = new Date(); // to prevent IE cache issues
	var url = fileConnector + '?path=' + encodeURIComponent(path) + '&mode=getfolder&showThumbs=' + showThumbs + '&time=' + d.getMilliseconds();
	if ($.urlParam('type')) url += '&type=' + $.urlParam('type');
	$.getJSON(url, function(data) {
		var result = '';
		// Is there any error or user is unauthorized?
		if(data.Code=='-1') {
			handleError(data.Error);
			return;
		};
		
		if(data) {
			result += "<ul class=\"jqueryFileTree\" style=\"display: none;\">";
			for(key in data) {
				var cap_classes = "";
				for (cap in capabilities) {
					if (has_capability(data[key], capabilities[cap])) {
						cap_classes += " cap_" + capabilities[cap];
					}
				}
				if (data[key]['File Type'] == 'dir') {
					result += "<li class=\"directory collapsed\"><a href=\"#\" class=\"" + cap_classes + "\" rel=\"" + data[key]['Path'] + "\">" + data[key]['Filename'] + "</a></li>";
				} else {
					result += "<li class=\"file ext_" + data[key]['File Type'].toLowerCase() + "\"><a href=\"#\" class=\"" + cap_classes + "\" rel=\"" + data[key]['Path'] + "\">" + data[key]['Filename'] + "</a></li>";
				}
			}
			result += "</ul>";
		} else {
			result += '<h1>' + lg.could_not_retrieve_folder + '</h1>';
		}
		callback(result);
	});
}




/*---------------------------------------------------------
  Initialization
---------------------------------------------------------*/

$(function(){
	if($.urlParam('expandedFolder') != 0) {
		expandedFolder = $.urlParam('expandedFolder');
		fullexpandedFolder = fileRoot + expandedFolder;
	} else {
		expandedFolder = '';
		fullexpandedFolder = null;
	}
	// Adjust layout.
	setDimensions();
	$(window).resize(setDimensions);

	// we finalize the FileManager UI initialization 
	// with localized text if necessary
	if(autoload == true) {
		$('#upload').append(lg.upload);
		$('#newfolder').append(lg.new_folder);
		$('#grid').attr('title', lg.grid_view);
		$('#list').attr('title', lg.list_view);
		$('#fileinfo h1').append(lg.select_from_left);
		$('#itemOptions a[href$="#select"]').append(lg.select);
		$('#itemOptions a[href$="#download"]').append(lg.download);
		$('#itemOptions a[href$="#rename"]').append(lg.rename);
		$('#itemOptions a[href$="#delete"]').append(lg.del);
	}

	// Provides support for adjustible columns.
	$('#splitter').splitter({
		sizeLeft: 200
	});

	// cosmetic tweak for buttons
	$('button').wrapInner('<span></span>');

	// Set initial view state.
	$('#fileinfo').data('view', defaultViewMode);
	setViewButtonsFor(defaultViewMode);
	
	$('#home').click(function(){
		var currentViewMode = $('#fileinfo').data('view');
		$('#fileinfo').data('view', currentViewMode);
		$('#filetree>ul>li.expanded>a').trigger('click');
		getFolderInfo(fileRoot);
	});

	// Set buttons to switch between grid and list views.
	$('#grid').click(function(){
		setViewButtonsFor('grid');
		$('#fileinfo').data('view', 'grid');
		getFolderInfo($('#currentpath').val());
	});
	
	$('#list').click(function(){
		setViewButtonsFor('list');
		$('#fileinfo').data('view', 'list');
		getFolderInfo($('#currentpath').val());
	});

	// Provide initial values for upload form, status, etc.
	setUploader(fileRoot);

	$('#uploader').attr('action', fileConnector);

	$('#uploader').ajaxForm({
		target: '#uploadresponse',
		beforeSubmit: function(arr, form, options) {
			$('#upload').attr('disabled', true);
			$('#upload span').addClass('loading').text(lg.loading_data);
			if ($.urlParam('type').toString().toLowerCase() == 'images') {
				// Test if uploaded file extension is in valid image extensions
				var newfileSplitted = $('#newfile', form).val().toLowerCase().split('.');
				for (key in imagesExt) {
					if (imagesExt[key] == newfileSplitted[newfileSplitted.length-1]) {
						return true;
					}
				}
				$.prompt(lg.UPLOAD_IMAGES_ONLY);
				return false;
			}
		},
		success: function(result){
			var data = jQuery.parseJSON($('#uploadresponse').find('textarea').text());
			
			if(data['Code'] == 0){
				addNode(data['Path'], data['Name']);
			} else {
				$.prompt(data['Error']);
			}
			$('#upload').removeAttr('disabled');
			$('#upload span').removeClass('loading').text(lg.upload);
			
			// clear data in browse input
                	$("#newfile").replaceWith('<input id="newfile" type="file" name="newfile">');
		}
	});

	// Creates file tree.
    $('#filetree').fileTree({
		root: fileRoot,
		datafunc: populateFileTree,
		multiFolder: false,
		folderCallback: function(path){ getFolderInfo(path); },
		expandedFolder: fullexpandedFolder,
		after: function(data){
			$('#filetree').find('li a').each(function() {
				$(this).contextMenu(
					{ menu: getContextMenuOptions($(this)) },
					function(action, el, pos){
						var path = $(el).attr('rel');
						setMenus(action, path);
					}
				)
			});
		}
	}, function(file){
		getFileInfo(file);
	});
	// Disable select function if no window.opener
	if(window.opener == null) $('#itemOptions a[href$="#select"]').remove();
	// Keep only browseOnly features if needed
	if(browseOnly == true) {
		$('#newfile').remove();
		$('#upload').remove();
		$('#newfolder').remove();
		$('#toolbar').remove('#rename');
		$('.contextMenu .rename').remove();
		$('.contextMenu .delete').remove();
	}
    getDetailView(fileRoot + expandedFolder);
});

})(jQuery);
