[//lasso
	define_type(
		'filemanager',
		-prototype,
		-description='Replacement for FCKEditor\'s built-in file manager.'
	);
		local('fileroot') = '/';
		local('patherror') = encode_json(
			map(
				'Error' = 'No permission to operate on specified path.',
				'Code' = -1
			)
		);
	
		define_tag('oncreate');
			var_defined('fileroot') ? self->fileroot = $fileroot;
		/define_tag;
	
		define_tag(
			'isvalidpath',
			-req='path',
			-description='Returns an error if the given path is not within the specified root path.'
		);			
			return(#path->beginswith(self->fileroot));
		/define_tag;
	
		define_tag(
			'getinfo',
			-req='path',
			-opt='getsize', -type='boolean',
			-description='Returns a JSON object containing information about the given file.'
		);
			!self->isvalidpath(#path) ? return(self->patherror);

			local('file') = map(
				'Filename' = (#path->endswith('/') ? string(#path)->removetrailing('/')&split('/')->last | #path->split('/')->last),
				'File Type' = '',
				'Preview' = (#path->endswith('/') ? 'images/fileicons/_Open.png' | #path),
				'Path' = #path,
				'Error' = '',
				'Code' = 0,
				'Properties' = map(
					'Date Created' = '',
					'Date Modified' = '',
					'Width' = '',
					'Height' = '',
					'Size' = ''
				)
			);
				
			local('imagetypes') = set('gif','jpg','jpeg','png');
			
			!local_defined('getsize') ? local('getsize') = true;
		
			if(!file_exists(#path));
				#file->find('Error') = 'File does not exist.';
				#file->find('Code') = file_currenterror( -errorcode);
				return(encode_json(#file));
			/if;
			
			if(#path->endswith('/'));
				#file->find('File Type') = 'Directory';
			else;
				local('ext') = #path->split('.')->last;
				#file->find('File Type') = #ext;
				
				if(#imagetypes >> #ext && #getsize);
					local('img') = image(#path);
					#file->find('Properties')->find('Width') = #img->width;
					#file->find('Properties')->find('Height') = #img->height;
					
				else;
					local('previewPath') = 'images/fileicons/' + #ext->uppercase& + '.png';
					#file->find('Preview') = (file_exists('../../' + #previewPath) ?  #previewPath | 'images/fileicons/default.png');
				/if;
			/if;

			#file->find('Properties')->find('Date Created') = file_creationdate(#path);
			#file->find('Properties')->find('Date Modified') = file_moddate(#path);
			local('rawsize') = integer(file_getsize(#path));
			#file->find('Properties')->find('Size') = #rawsize;
			
			return(encode_json(#file));
		/define_tag;

		define_tag(
			'getfolder',
			-req='path',
			-opt='getsizes', -type='boolean'
		);
			!self->isvalidpath(#path) ? return(self->patherror);

			local('out') = array;			
			local('list') = file_listdirectory(#path);
			
			!local_defined('getsizes') ? local('getsizes') = true;
			
			iterate(#list, local('i'));
				!#i->beginswith('.') ? #out->insert(literal(self->getinfo(#path + #i, -getsize=#getsizes)));
			/iterate;
			
			return(encode_json(#out));
		/define_tag;
		
		define_tag(
			'rename',
			-req='old',
			-req='new'
		);
			!self->isvalidpath(#old) ? return(self->patherror);

			local('oldname') = #old->removetrailing('/')&split('/')->last;
			local('path') = string(#old)->removetrailing(#oldname)&;
			!#path->endswith('/') ? #path->append('/');
			local('newname') = encode_urlpath(#new);
			local('newpath') = #path + #newname;
			
			file_move(#old, #newpath, -fileoverwrite);
			
			local('result') = map(
				'Old Path' = #old,
				'Old Name' = #oldname,
				'New Path' = #newpath,
				'New Name' = #newname,
				'Code' = file_currenterror( -errorcode), 
				'Error' = file_currenterror
			);
			
			return(encode_json(#result));
		/define_tag;

		define_tag(
			'delete',
			-req='path'
		);
			!self->isvalidpath(#path) ? return(self->patherror);

			file_delete(#path);
			
			local('result') = map(
				'Path' = #path,
				'Error' = file_currenterror,
				'Code' = file_currenterror( -errorcode)
			);
			
			return(encode_json(#result));
		/define_tag;
		
		define_tag(
			'add',
			-req='path',
			-encodenone
		);		
			!self->isvalidpath(#path) ? return(self->patherror);

			if(file_uploads->size);
				local('upload') = file_uploads->first;				
				local('newName') = encode_urlpath(#upload->find('origname'));
				
				file_copy(#upload->find('path'), #path + #newName, -fileoverwrite);

				local('result') = map(
					'Path' = #path,
					'Name' = #newName,
					'Error' = file_currenterror,
					'Code' = file_currenterror( -errorcode)
				);
				
			else;
				local('result') = map(
					'Path' = #path,
					'Error' = 'No file was uploaded.',
					'Code' = -1
				);		
			/if;
			
			return(@('<textarea>' + encode_json(#result) + '</textarea>'));
		/define_tag;
		
		define_tag(
			'addfolder',
			-req='path',
			-req='name'
		);
			!self->isvalidpath(#path) ? return(self->patherror);

			local('newName') = encode_urlpath(#name);
			local('newPath') = #path + #newName + '/';
			file_create(#newPath, -fileoverwrite);
			
			local('result') = map(
				'Parent' = #path,
				'Name' = #newName,
				'Error' = file_currenterror,
				'Code' = file_currenterror( -errorcode)
			);
			
			return(encode_json(#result));			
		/define_tag;
		
		define_tag(
			'download',
			-req='path'
		);
			!self->isvalidpath(#path) ? return(self->patherror);
			local('name') = #path->split('/')->last;
			local('file') = include_raw(#path);
			file_serve(#file, #name, -type='application/x-download');
		/define_tag;
	/define_type;
]
