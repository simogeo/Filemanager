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

$fm = new Filemanager();

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
        if($fm->getvar('old') && $fm->getvar('new', 'parent_dir') && $fm->getvar('root')) {
          $response = $fm->move();
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
?>