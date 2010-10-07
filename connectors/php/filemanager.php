<?php

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
require_once('filemanager.config.php');
require_once('filemanager.class.php');
$fm = new Filemanager($config);

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
          $fm->preview();
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

    }

  }
}

echo json_encode($response);
die();

?>