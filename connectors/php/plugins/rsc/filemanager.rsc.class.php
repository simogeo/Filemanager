<?php
/**
*	Filemanager PHP RSC plugin class
*
*	filemanager.rsc.class.php
*	class for the filemanager.php connector which utilizes the Rackspace Cloud Files API 
*	instead of the local filesystem
*
*	@license	MIT License
*	@author		Alan Blount <alan (at) zeroasterisk (dot) com>
*	@author		Riaan Los <mail (at) riaanlos (dot) nl>
*	@author		Simon Georget <simon (at) linea21 (dot) com>
*	@copyright	Authors
*/

class Filemanager {
	
	protected $config = array();
	protected $language = array();
	protected $get = array();
	protected $post = array();
	protected $properties = array();
	protected $item = array();
	protected $languages = array();
	protected $root = '';
	protected $doc_root = '';
	
	public function __construct($config) {
		$this->config = $config;
		require_once('cloudfiles.php');
		$auth = new CF_Authentication($this->config['rsc-username'], $this->config['rsc-apikey']);
		$auth->authenticate();
		$this->conn = new CF_Connection($auth);
		if ($this->config['rsc-ssl_use_cabundle']) {
			$this->conn->ssl_use_cabundle();
		}
		
		$this->root = dirname(dirname(dirname(dirname(dirname(__FILE__))))).DIRECTORY_SEPARATOR;
		
		$this->properties = array(
			'Date Created'=>null,
			'Date Modified'=>null,
			'Height'=>null,
			'Width'=>null,
			'Size'=>null
			);
		$this->doc_root = null;
		$this->setParams();
		$this->availableLanguages();
		$this->loadLanguageFile();
	}
	
	
	public function error($string,$textarea=false) {
		$array = array(
			'Error'=>$string,
			'Code'=>'-1',
			'Properties'=>$this->properties
			);
		if($textarea) {
			echo '<textarea>' . json_encode($array) . '</textarea>';
		} else {
			echo json_encode($array);
		}
		die();
	}
	
	public function lang($string) {
		if(isset($this->language[$string]) && $this->language[$string]!='') {
			return $this->language[$string];
		} else {
			return 'Language string error on ' . $string;
		}
	}
	
	public function getvar($var) {
		if(!isset($_GET[$var]) || $_GET[$var]=='') {
			$this->error(sprintf($this->lang('INVALID_VAR'),$var));
		} else {
			$this->get[$var] = $this->sanitize($_GET[$var]);
			return true;
		}
	}
	public function postvar($var) {
		if(!isset($_POST[$var]) || $_POST[$var]=='') {
			$this->error(sprintf($this->lang('INVALID_VAR'),$var));
		} else {
			$this->post[$var] = $_POST[$var];
			return true;
		}
	}
	
	public function getinfo() {
		$object = $this->get_object();
		if (isset($object->name)) {
			$object = $this->get_file_info(&$object);
			return array(
				'Path' => $object->path,
				'Filename' => $object->name,
				'File Type' => $object->filetype,
				'Preview' => $object->preview,
				'Properties'=> $object->properties,
				'Error' => "",
				'Code' => 0
				);
		}
		
		$container = $this->get_container();
		if (isset($container->name)) {
			return array(
				'Path' => $container->path,
				'Filename' => $container->name,
				'File Type' => 'dir',
				'Preview' => $this->config['icons']['path'] . $this->config['icons']['directory'],
				'Properties'=>array(
					'Date Created'=>null,
					'Date Modified'=>null,
					'Height'=>null,
					'Width'=>null,
					'Size'=>null
					),
				'Error' => "",
				'Code' => 0
				);
		}
		return array();
	}
	
	public function getfolder() {
		$container = trim($this->get['path'], '/ ');
		$containerParts = explode('/', $container);
		if ($containerParts[0]=='containers') {
			array_shift($containerParts); 
		}
		$array = array();
		if (empty($containerParts) || trim($this->get['path'], '/ ')=='containers') {
			$containers = $this->conn->list_containers();
			$containers = array_diff($containers, $this->config['unallowed_dirs']);
			foreach ( $containers as $container ) { 
				$array['/containers/' . $container . '/'] = array(
					'Path'=> '/containers/' . $container .'/',
					'Filename'=> $container,
					'File Type'=>'dir',
					'Preview'=> $this->config['icons']['path'] . $this->config['icons']['directory'],
					'Properties'=>array(
						'Date Created'=>null,
						'Date Modified'=>null,
						'Height'=>null,
						'Width'=>null,
						'Size'=>null
						),
					'Error'=>"",
					'Code'=>0
					);
			}
		} else {
			$container = array_shift($containerParts);
			$limit = 0;
			$marker = null; // last record returned from a dataset
			$prefix = null; // search term (starts with)
			$path = null; // pseudo-hierarchical containers
			if (!empty($containerParts)) {
				$path = implode('/', $containerParts);
			}
			$container = $this->conn->get_container($container);
			//$list = $container->list_objects($limit, $marker,  $prefix, $path);
			$objects = $container->get_objects($limit, $marker,  $prefix, $path);
			foreach ( $objects as $object ) {
				if(!isset($this->params['type']) || (isset($this->params['type']) && strtolower($this->params['type'])=='images' && in_array(strtolower($object->content_type),$this->config['images']))) {
					if($this->config['upload']['imagesonly']== false || ($this->config['upload']['imagesonly']== true && in_array(strtolower($object->content_type),$this->config['images']))) {
						$object = $this->get_file_info(&$object);
						$array[$object->url] = array(
							'Path'=> $object->path,
							'Filename' => $object->name,
							'File Type' => $object->filetype,
							'Mime Type' => $object->content_type,
							'Preview' => $object->preview,
							'Properties' => $object->properties,
							'Error' => "",
							'Code' => 0
							);
					}
				}
			}
		}
		return $array;
	}
	
	public function rename() {
		// keep old filename, if missing from new
		$newNameParts = explode('.', $this->get['new']);
		$newNameExt = $newNameParts[(count($newNameParts)-1)];
		if (strlen($newNameExt) > 5 || count($newNameParts)==1) {
			$this->get['new'].='.'.array_pop(explode('.', $this->get['old']));
		}
		// get old
		$object = $this->get_object($this->get['old']);
		if (!isset($object->container)) {
			$this->error(sprintf($this->lang('FILE_DOES_NOT_EXIST'),$path));
		}
		if (in_array($this->get['new'], $object->container->list_objects())) {
			$this->error(sprintf($this->lang('FILE_ALREADY_EXISTS'),$this->get['new']));
			return false;
		}
		// create to new
		$new = $object->container->create_object($this->get['new']);
		$new->content_type = $object->content_type;
		$data = $object->read();
		$new->write($data);
		if (!empty($object->metadata)) {
			$new->metadata = $object->metadata;
			$object->sync_metadata(); // save back to RSC
		}
		$object->container->delete_object($object->name);
		$array = array(
			'Error'=>"",
			'Code'=>0,
			'Old Path'=>$object->path,
			'Old Name'=>$object->name,
			'New Path'=>$new->path,
			'New Name'=>$new->name
			);
		return $array;
	}
	
	public function delete() {
		$object = $this->get_object();
		if (isset($object->name)) {
			$object->container->delete_object($object->name);
			return array(
				'Error'=>"",
				'Code'=>0,
				'Path'=>$this->get['path']
				);
		}
		$container = $this->get_container();
		if (isset($container->name)) {
			$list = $container->list_objects(5);
			if (!empty($list)) {
				$this->error("Unable to Delete Container, it is not empty.");
				return false;
			}
			$this->conn->delete_container($container->name);
			return array(
				'Error'=>"",
				'Code'=>0,
				'Path'=>$this->get['path']
				);
		}
		$this->error(sprintf($this->lang('INVALID_DIRECTORY_OR_FILE')));
	}
	
	public function add() {
		$this->setParams();
		if(!isset($_FILES['newfile']) || !is_uploaded_file($_FILES['newfile']['tmp_name'])) {
			$this->error(sprintf($this->lang('INVALID_FILE_UPLOAD')),true);
		}
		if(($this->config['upload']['size']!=false && is_numeric($this->config['upload']['size'])) && ($_FILES['newfile']['size'] > ($this->config['upload']['size'] * 1024 * 1024))) {
			$this->error(sprintf($this->lang('UPLOAD_FILES_SMALLER_THAN'),$this->config['upload']['size'] . 'Mb'),true);
		}
		
		$size = @getimagesize($_FILES['newfile']['tmp_name']);
		if($this->config['upload']['imagesonly'] || (isset($this->params['type']) && strtolower($this->params['type'])=='images')) {
			if(empty($size) || !is_array($size)) {
				$this->error(sprintf($this->lang('UPLOAD_IMAGES_ONLY')),true);
			}
			if(!in_array($size[2], array(1, 2, 3, 7, 8))) {
				$this->error(sprintf($this->lang('UPLOAD_IMAGES_TYPE_JPEG_GIF_PNG')),true);
			}
		}
		$_FILES['newfile']['name'] = $this->cleanString($_FILES['newfile']['name'],array('.','-'));
		
		$container = $this->get_container($this->post['currentpath']);
		
		if(!$this->config['upload']['overwrite']) {
			$list = $container->list_objects();
			$i = 0;
			while (in_array($_FILES['newfile']['name'], $list)) {
				$i++;
				$parts = explode('.', $_FILES['newfile']['name']);
				$ext = array_pop($parts);
				$parts = array_diff($parts, array("copy{$i}", "copy".($i-1)));
				$parts[] = "copy{$i}";
				$parts[] = $ext;
				$_FILES['newfile']['name'] = implode('.', $parts);
			}
		}
		
		$object = $container->create_object($_FILES['newfile']['name']);
		$object->load_from_filename($_FILES['newfile']['tmp_name']);
		// set image details
		if (is_array($size) && count($size) > 1) {
			$object->metadata->height = $object->height = $size[1];
			$object->metadata->width = $object->width = $size[0];
			$object->sync_metadata(); // save back to RSC
		}
		unlink($_FILES['newfile']['tmp_name']);
		
		$response = array(
			'Path'=>$this->post['currentpath'],
			'Name'=>$_FILES['newfile']['name'],
			'Error'=>"",
			'Code'=>0
			);
		echo '<textarea>' . json_encode($response) . '</textarea>';
		die();
	}
	
	public function addfolder() {
		$container = trim($this->get['path'], '/ ');
		$containerParts = explode('/', $container);
		if ($containerParts[0]=='containers') {
			array_shift($containerParts); 
		}
		if (!empty($containerParts)) {
			$this->error(sprintf($this->lang('UNABLE_TO_CREATE_DIRECTORY'),$newdir));
		}
		$newdir = $this->cleanString($this->get['name']);
		$container = $this->conn->create_container($newdir);
		$container->make_public(86400/2);
		return array(
			'Parent' => "/containers/{$container->name}",
			'Name' => $container->name,
			'Error'=>"",
			'Code'=>0
			);
	}
	
	public function download() {
		$object = $this->get_object();
		if (isset($object->name)) {
			header("Content-type: application/force-download");
			header('Content-Disposition: inline; filename="' . $object->name . '"');
			header("Content-Type: " . $doc->content_type);
			$output = fopen("php://output", "w");
			$object->stream($output); # stream object content to PHP's output buffer
			fclose($output);
			return true;
		}
		$this->error(sprintf($this->lang('FILE_DOES_NOT_EXIST'),$this->get['path']));
	}
	
	public function preview() {
		
		if(isset($this->get['path']) && file_exists($this->doc_root . $this->get['path'])) {
			header("Content-type: image/" .$ext = pathinfo($this->get['path'], PATHINFO_EXTENSION));
			header("Content-Transfer-Encoding: Binary");
			header("Content-length: ".filesize($this->doc_root . $this->get['path']));
			header('Content-Disposition: inline; filename="' . basename($this->get['path']) . '"');
			readfile($this->doc_root . $this->get['path']);
		} else {
			$this->error(sprintf($this->lang('FILE_DOES_NOT_EXIST'),$this->get['path']));
		}
	}
	
	private function setParams() {
		$tmp = $_SERVER['HTTP_REFERER'];
		$tmp = explode('?',$tmp);
		$params = array();
		if(isset($tmp[1]) && $tmp[1]!='') {
			$params_tmp = explode('&',$tmp[1]);
			if(is_array($params_tmp)) {
				foreach($params_tmp as $value) {
					$tmp = explode('=',$value);
					if(isset($tmp[0]) && $tmp[0]!='' && isset($tmp[1]) && $tmp[1]!='') {
						$params[$tmp[0]] = $tmp[1];
					}
				}
			}
		}
		$this->params = $params;
	}
	
	
	private function get_container($path=null, $showError=false) {
		if (empty($path)) {
			$path = $this->get['path'];
		}
		$container = trim($path, '/ ');
		$containerParts = explode('/', $container);
		if ($containerParts[0]=='containers') {
			array_shift($containerParts); 
		}
		$array = array();
		if (count($containerParts) > 0) {
			$container = $this->conn->get_container(array_shift($containerParts));
			if (isset($container->name)) {
				$container->path = '/containers/'.$container->name;
				return $container;
			}
		}
		if ($showError) {
			$this->error(sprintf($this->lang('FILE_DOES_NOT_EXIST'),$path));
		}
		return false;
	}
	private function get_object($path=null, $showError=false) {
		if (empty($path)) {
			$path = $this->get['path'];
		}
		$container = trim($path, '/ ');
		$containerParts = explode('/', $container);
		if ($containerParts[0]=='containers') {
			array_shift($containerParts); 
		}
		$array = array();
		if (count($containerParts) > 1) {
			$container = $this->conn->get_container(array_shift($containerParts));
			$object = $container->get_object(array_shift($containerParts));
			if (isset($object->name) && isset($object->container->name)) {
				$object->path = '/containers/'.$object->container->name.'/'.$object->name;
				return $object;
			}
		}
		if ($showError) {
			$this->error(sprintf($this->lang('FILE_DOES_NOT_EXIST'),$path));
		}
		return false;
	}
	private function get_file_info($object=null) {
		if (empty($object) || !is_object($object)) {
			return null; 
		}
		// parse into file extension types
		//$object->filetype = array_pop(explode('/', $object->content_type));
		$object->filetype = array_pop(explode('.', $object->name));
		// setup values
		$object->height = null;
		$object->width = null;
		if (isset($object->metadata->height)) {
			$object->height = $object->metadata->height;
		}
		if (isset($object->metadata->width)) {
			$object->width = $object->metadata->width;
		}
		$preview = $this->config['icons']['path'] . $this->config['icons']['default'];
		if(file_exists($this->root . $this->config['icons']['path'] . strtolower($object->filetype) . '.png')) {
			$preview = $this->config['icons']['path'] . strtolower($object->filetype) . '.png';
		}
		if (in_array(strtolower($object->filetype), $this->config['images'])) {
			$preview = $object->container->cdn_uri . '/' . $object->name;
			if (empty($object->height) && empty($object->width) && isset($this->config['rsc-getsize']) && !empty($get['rsc-getsize'])) {
				list($width, $height, $type, $attr) = getimagesize($this->doc_root . $path);
				$object->metadata->height = $object->height = $height;
				$object->metadata->width = $object->width = $width;
				$object->sync_metadata(); // save back to RSC
			}
		}
		$object->filename = $object->name;
		$object->path = '/containers/'.$object->container->name.'/'.$object->name;
		$object->url = $object->container->cdn_uri . '/' . $object->name;
		$object->mimetype = $object->content_type;
		$object->filemtime = $object->last_modified;
		$object->preview = $preview;
		$object->size = $object->content_length;
		$object->date = date($this->config['date'], strtotime($object->last_modified));
		$object->properties = array(
			'Date Modified' => $object->date,
			'Size' => $object->size,
			'Height' => $object->height,
			'Width' => $object->width,
			);
		return $object;
	}
	
	private function cleanString($string, $allowed = array()) {
		$allow = null;
		
		if (!empty($allowed)) {
			foreach ($allowed as $value) {
				$allow .= "\\$value";
			}
		}
		
		$mapping = array(
			'Š'=>'S', 'š'=>'s', 'Đ'=>'Dj', 'đ'=>'dj', 'Ž'=>'Z', 'ž'=>'z', 'Č'=>'C', 'č'=>'c', 'Ć'=>'C', 'ć'=>'c',
			'À'=>'A', 'Á'=>'A', 'Â'=>'A', 'Ã'=>'A', 'Ä'=>'A', 'Å'=>'A', 'Æ'=>'A', 'Ç'=>'C', 'È'=>'E', 'É'=>'E',
			'Ê'=>'E', 'Ë'=>'E', 'Ì'=>'I', 'Í'=>'I', 'Î'=>'I', 'Ï'=>'I', 'Ñ'=>'N', 'Ò'=>'O', 'Ó'=>'O', 'Ô'=>'O',
			'Õ'=>'O', 'Ö'=>'O', 'Ø'=>'O', 'Ù'=>'U', 'Ú'=>'U', 'Û'=>'U', 'Ü'=>'U', 'Ý'=>'Y', 'Þ'=>'B', 'ß'=>'Ss',
			'à'=>'a', 'á'=>'a', 'â'=>'a', 'ã'=>'a', 'ä'=>'a', 'å'=>'a', 'æ'=>'a', 'ç'=>'c', 'è'=>'e', 'é'=>'e',
			'ê'=>'e', 'ë'=>'e', 'ì'=>'i', 'í'=>'i', 'î'=>'i', 'ï'=>'i', 'ð'=>'o', 'ñ'=>'n', 'ò'=>'o', 'ó'=>'o',
			'ô'=>'o', 'õ'=>'o', 'ö'=>'o', 'ø'=>'o', 'ù'=>'u', 'ú'=>'u', 'û'=>'u', 'ý'=>'y', 'ý'=>'y', 'þ'=>'b',
			'ÿ'=>'y', 'Ŕ'=>'R', 'ŕ'=>'r', ' '=>'_', "'"=>'_', '/'=>''
			);
		
        if (is_array($string)) {
        	
        	$cleaned = array();
        	
        	foreach ($string as $key => $clean) {
        		$clean = strtr($clean, $mapping);
        		$clean = preg_replace("/[^{$allow}_a-zA-Z0-9]/", '', $clean);
        		$cleaned[$key] = preg_replace('/[_]+/', '_', $clean); // remove double underscore
        	}
        } else {
        	$string = strtr($string, $mapping);
        	$string = preg_replace("/[^{$allow}_a-zA-Z0-9]/", '', $string);
        	$cleaned = preg_replace('/[_]+/', '_', $string); // remove double underscore
        }
        return $cleaned;
    }
    
    private function sanitize($var) {
    	$sanitized = strip_tags($var);
    	$sanitized = str_replace('http://', '', $sanitized);
    	$sanitized = str_replace('https://', '', $sanitized);
    	$sanitized = str_replace('../', '', $sanitized);
    	return $sanitized;
    }
    
    
    private function loadLanguageFile() {
    	
    	// we load langCode var passed into URL if present and if exists
    	// else, we use default configuration var
    	$lang = $this->config['culture'];
    	if(isset($this->params['langCode']) && in_array($this->params['langCode'], $this->languages)) $lang = $this->params['langCode'];
    	
    	if(file_exists($this->root. 'scripts/languages/'.$lang.'.js')) {
    		$stream =file_get_contents($this->root. 'scripts/languages/'.$lang.'.js');
    		$this->language = json_decode($stream, true);
    	} else {
    		$stream =file_get_contents($this->root. 'scripts/languages/'.$lang.'.js');
    		$this->language = json_decode($stream, true);
    	}
    }
    
    private function availableLanguages() {
    	
    	if ($handle = opendir($this->root.'/scripts/languages/')) {
    		while (false !== ($file = readdir($handle))) {
    			if ($file != "." && $file != "..") {
    				array_push($this->languages, pathinfo($file, PATHINFO_FILENAME));
    			}
    		}
    		closedir($handle);
    	}
    }
}
?>
