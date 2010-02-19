[//lasso
	protect;
		library('filemanager.config.inc');
		
		handle_error;
			content_type('text/plain');
			content_body = '{Error: "Configuration File Missing", Code: -1}';
			abort;
		/handle_error;
	/protect;
	
	inline($auth);	
		namespace_using(namespace_global);
			library('encode_json.inc'); // load every time to avoid version mismatches
			!lasso_tagexists('client_params') || !lasso_tagexists('client_param') ? library('client_params.inc');
			!lasso_tagexists('encode_urlpath') ? library('encode_urlpath.inc');
			!lasso_tagexists('filemanager') ? library('filemanager.inc');	
		/namespace_using;
		
		select(client_param('mode'));
			case('getinfo');
				content_type('text/plain');
				content_body = filemanager->getinfo(client_param('path'));
				abort;
	
			case('getfolder');
				content_type('text/plain');
				content_body = filemanager->getfolder(
					client_param('path'), 
					-getsizes=boolean(client_param('showThumbs'))
				);
				abort;
			
			case('rename');
				content_type('text/plain');
				content_body = filemanager->rename(
					client_param('old'), 
					client_param('new')
				);
				abort;		
			
			case('delete');
				content_type('text/plain');
				content_body = filemanager->delete(client_param('path'));
				abort;		
			
			case('add');
				content_type('text/html');
				content_body = filemanager->add(client_param('currentpath'));
				abort;		
			
			case('addfolder');
				content_type('text/plain');
				content_body = filemanager->addfolder(
					client_param('path'), 
					client_param('name')
				);
				abort;		
			
			case('download');
				filemanager->download(client_param('path'));
				
		/select;	
	/inline;
]
