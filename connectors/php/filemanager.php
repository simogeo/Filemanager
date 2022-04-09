<<<<<<< HEAD
<?php
// only for debug
// error_reporting(E_ERROR | E_WARNING | E_PARSE | E_NOTICE);
// ini_set('display_errors', '1');
/**
 *	Filemanager PHP connector
 *
 *	filemanager.php
 *	use for ckeditor filemanager plug-in by Core Five - http://labs.corefive.com/Projects/FileManager/
 *
 *	@license	MIT License
 *	@author		Riaan Los <mail (at) riaanlos (dot) nl>
 *  @author		Simon Georget <simon (at) linea21 (dot) com>
 *	@copyright	Authors
 */
session_start();
require_once('./inc/filemanager.inc.php');
require_once('filemanager.class.php');

/**
 *	Check if user is authorized
 *
 *	@return boolean true is access granted, false if no access
 */
function auth() {
  // You can insert your own code over here to check if the user is authorized.
  // If you use a session variable, you've got to start the session first (session_start())
  return true;
}


// @todo Work on plugins registration
// if (isset($config['plugin']) && !empty($config['plugin'])) {
// 	$pluginPath = 'plugins' . DIRECTORY_SEPARATOR . $config['plugin'] . DIRECTORY_SEPARATOR;
// 	require_once($pluginPath . 'filemanager.' . $config['plugin'] . '.config.php');
// 	require_once($pluginPath . 'filemanager.' . $config['plugin'] . '.class.php');
// 	$className = 'Filemanager'.strtoupper($config['plugin']);
// 	$fm = new $className($config);
// } else {
// 	$fm = new Filemanager($config);
// }
if (substr_count($_SERVER['HTTP_HOST'], "ca-dev") > 0 OR $_SERVER['HTTP_HOST'] == 'localhost' OR substr_count($_SERVER['HTTP_HOST'], 'localhost.enguehard.info') > 0) {
  $tab = explode('.', $_SERVER['SERVER_NAME']);
  if ($_SERVER['HTTP_HOST'] == 'localhost') {
    $sys['base_dir'] = $_SERVER["DOCUMENT_ROOT"];
    $sys['documentRoot'] = $_SERVER["DOCUMENT_ROOT"].'../';
  } else {
    $sys['base_dir'] = $_SERVER["DOCUMENT_ROOT"].$tab[0].'/www';
    $sys['documentRoot'] = $_SERVER["DOCUMENT_ROOT"].$tab[0];
  }
  $sys['env'] = 'dev';
} else {
  $sys['base_dir'] = $_SERVER["DOCUMENT_ROOT"];
  $sys['documentRoot'] = $_SERVER["DOCUMENT_ROOT"].'/../';
  $sys['env'] = 'prod';
}

if (isset($_SESSION['userfoldername'])) {
  $folderPath = $sys['base_dir'].'/userfiles/image/'.$_SESSION['userfoldername'].'/';
} else {
  $folderPath = $sys['base_dir'].'/userfiles/image/';
}


$fm = new Filemanager();
$fm->setFileRoot($folderPath);
// $fm->enableLog('/tmp/filemanager.log');

$response = '';


if(!auth()) {
  $fm->error($fm->lang('AUTHORIZATION_REQUIRED'));
}

if(!isset($_GET)) {
  $fm->error($fm->lang('INVALID_ACTION'));
} else {

  if(isset($_GET['mode']) && $_GET['mode']!='') {

    switch($_GET['mode']) {

      default:

        $fm->error($fm->lang('MODE_ERROR'));
        break;

      case 'getinfo':

        if($fm->getvar('path')) {
          $response = $fm->getinfo();
        }
        break;

      case 'getfolder':

        if($fm->getvar('path')) {
          $response = $fm->getfolder();
        }
        break;

      case 'rename':

        if($fm->getvar('old') && $fm->getvar('new')) {
          $response = $fm->rename();
        }
        break;

      case 'delete':

        if($fm->getvar('path')) {
          $response = $fm->delete();
        }
        break;

      case 'addfolder':

        if($fm->getvar('path') && $fm->getvar('name')) {
          $response = $fm->addfolder();
        }
        break;

      case 'download':
        if($fm->getvar('path')) {
          $fm->download();
        }
        break;

      case 'preview':
        if($fm->getvar('path')) {
        	if(isset($_GET['thumbnail'])) {
        		$thumbnail = true;
        	} else {
        		$thumbnail = false;
        	}
          $fm->preview($thumbnail);
        }
        break;

      case 'maxuploadfilesize':
        $fm->getMaxUploadFileSize();
        break;
    }

  } else if(isset($_POST['mode']) && $_POST['mode']!='') {

    switch($_POST['mode']) {

      default:

        $fm->error($fm->lang('MODE_ERROR'));
        break;

      case 'add':

        if($fm->postvar('currentpath')) {
          $fm->add();
        }
        break;

    }

  }
}

echo json_encode($response);
die();
=======
<?php
// only for debug
// error_reporting(E_ERROR | E_WARNING | E_PARSE | E_NOTICE);
// ini_set('display_errors', '1');
/**
 *	Filemanager PHP connector
 *
 *	filemanager.php
 *	use for ckeditor filemanager plug-in by Core Five - http://labs.corefive.com/Projects/FileManager/
 *
 *	@license	MIT License
 *	@author		Riaan Los <mail (at) riaanlos (dot) nl>
 *  @author		Simon Georget <simon (at) linea21 (dot) com>
 *	@copyright	Authors
 */

require_once('filemanager.class.php');

// for php 5.2 compatibility
if (!function_exists('array_replace_recursive')) {
	function array_replace_recursive($array, $array1) {
		function recurse($array, $array1) {
			foreach($array1 as $key => $value) {
				// create new key in $array, if it is empty or not an array
				if (!isset($array[$key]) || (isset($array[$key]) && !is_array($array[$key]))) {
					$array[$key] = array();
				}

				// overwrite the value in the base array
				if (is_array($value)) {
					$value = recurse($array[$key], $value);
				}
				$array[$key] = $value;
			}
			return $array;
		}

		// handle the arguments, merge one by one
		$args = func_get_args();
		$array = $args[0];
		if (!is_array($array)) {
			return $array;
		}
		for ($i = 1; $i < count($args); $i++) {
			if (is_array($args[$i])) {
				$array = recurse($array, $args[$i]);
			}
		}
		return $array;

	}
}

// if user file is defined we include it, else we include the default file
(file_exists('user.config.php')) ? include_once('user.config.php') : include_once('default.config.php');

// auth() function is already defined
// and Filemanager is instantiated as $fm

$response = '';

if(!auth()) {
  $fm->error($fm->lang('AUTHORIZATION_REQUIRED'));
}

if(!isset($_GET)) {
  $fm->error($fm->lang('INVALID_ACTION'));
} else {

  if(isset($_GET['mode']) && $_GET['mode']!='') {

    switch($_GET['mode']) {
      	
      default:

        $fm->error($fm->lang('MODE_ERROR'));
        break;

      case 'getinfo':

        if($fm->getvar('path')) {
          $response = $fm->getinfo();
        }
        break;

      case 'getfolder':
        	
        if($fm->getvar('path')) {
          $response = $fm->getfolder();
        }
        break;

      case 'rename':

        if($fm->getvar('old') && $fm->getvar('new')) {
          $response = $fm->rename();
        }
        break;

      case 'move':
        // allow "../"
        if($fm->getvar('old') && $fm->getvar('new') && $fm->getvar('root')) {
          $response = $fm->move();
        }
        break;

      case 'editfile':
        	 
        if($fm->getvar('path')) {
        	$response = $fm->editfile();
        }
        break;
        
      case 'delete':

        if($fm->getvar('path')) {
          $response = $fm->delete();
        }
        break;

      case 'addfolder':

        if($fm->getvar('path') && $fm->getvar('name')) {
          $response = $fm->addfolder();
        }
        break;

      case 'download':
        if($fm->getvar('path')) {
          $fm->download();
        }
        break;
        
      case 'preview':
        if($fm->getvar('path')) {
        	if(isset($_GET['thumbnail'])) {
        		$thumbnail = true;
        	} else {
        		$thumbnail = false;
        	}
          $fm->preview($thumbnail);
        }
        break;
    }

  } else if(isset($_POST['mode']) && $_POST['mode']!='') {

    switch($_POST['mode']) {
      	
      default:

        $fm->error($fm->lang('MODE_ERROR'));
        break;
        	
      case 'add':

        if($fm->postvar('currentpath')) {
          $fm->add();
        }
        break;

    	case 'replace':
    
	    	if($fm->postvar('newfilepath')) {
	    		$fm->replace();
	    	}
	    	break;
    
	    case 'savefile':
	    	
	    	if($fm->postvar('content', false) && $fm->postvar('path')) {
	    		$response = $fm->savefile();
	    	}
	    	break;
    }

  }
}

echo json_encode($response);
die();
>>>>>>> c75b9144aaed3060951f996ae097f2ed68cb0d55
?>