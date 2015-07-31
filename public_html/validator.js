/**
 *  This is validator.js
 */

( function() {
	'use strict';
	var validator = window.validator = {
		showRequest: function() {
			var $form = $( this )
				.closest( 'form' )
				.block( {
					message: 'validating',
					css: {
						'border': 'none'
					}
				} ),
				action = $form.attr( 'action' ),
				url = encodeURI( $( '<a>' )
					.attr( 'href', action )
					.prop( 'href' ) ),
				method = $form.attr( 'method' );

			$( '.required-but-not-supplied' )
				.removeClass( 'required-but-not-supplied' );
			if ( !validator.validateInput( $form ) ) {
				return $form.unblock();
			}
			validator.getParams( $form )
				.done( function( params ) {
					var jsCode = validator.jsCode( params, url ),
						multipartRequest = validator.multipartRequest( params, url, method );

					validator.displayJS( $form, jsCode );
					validator.displayMultipartRequest( $form, multipartRequest );
					validator
						.makeRequest( params, action )
						.done( function( r ) {
							validator.displayResult( $form, r );
							$form.unblock();
						} );
				} );
		},
		getParams: function( $form ) {
			var $inputs = $form.find( 'input,select,textarea' ),
				$def = $.Deferred(),
				pending = 0,
				params = {};

			$inputs.each( function() {
				var param = {},
					$input = $( this );

				param.value = $input.val();
				param.name = $input.attr( 'name' );
				param.$input = $input;
				param.file = $input.attr( 'type' ) === 'file';
				if ( param.file ) {
					param.readFile = function() {
						var $def = new $.Deferred(),
							reader = new FileReader();

						reader.onloadend = function( evt ) {
							if ( evt.target.readyState === FileReader.DONE ) {
								$def.resolve( evt.target.result );
							}
						};
						if ( reader.readAsBinaryString ) {
							reader.readAsBinaryString( $input[ 0 ].files[ 0 ] );
						} else if ( reader.readAsText ) {
							reader.readAsText( $input[ 0 ].files[ 0 ] );
						}
						return $def.promise();
					};
					pending++;
					param.readFile()
						.done( function( binString ) {
							pending--;
							param.fileData = binString;
							if ( pending === 0 ) {
								$def.resolve( params );
							}
						} );
				}
				params[ param.name ] = param;
			} );
			if ( pending === 0 ) {
				$def.resolve( params );
			}
			return $def.promise();
		},
		validateInput: function( $form ) {
			var $fileInputs = $form.find( 'input[type="file"]' ),
				valid = true;

			$fileInputs.each( function() {
				if ( !this.files[ 0 ] ) {
					$( this )
						.addClass( 'required-but-not-supplied' );
					valid = false;
				}
			} );
			return valid;
		},
		jsCode: function( params, url ) {
			var result = 'var formData = new FormData();\n';
			$.each( params, function( pName, p ) {
				if ( !p.file ) {
					result += 'formData.append("' +
						pName.replace( /"/g, '\\"' ) + '", "' +
						p.value.replace( /"/g, '\\"' ) + '");\n';
				} else {
					result += '// File object (e.g. document.querySelector(\'input[type="file"]\').files[0]) or Blob\n' +
						'var fileOrBlob = new Blob([\'text to validate\'], { type: \'text/plain\' });\n' +
						'fileOrBlob = $(\'#' + p.$input.attr( 'id' ) + '\')[0].files[0];\n';
					result += '\n' + 'formData.append("' +
						pName.replace( /"/g, '\\"' ) + '", ' +
						'fileOrBlob' + ', "' +
						p.value.replace( /"/g, '\\"' ) + '");\n';
				}
			} );
			result += 'var rq = new XMLHttpRequest();\n';
			result += 'rq.open("POST", "' + url + '");\n';
			result += 'rq.onload = function(oEvent) { if (rq.status === 200) { console.log(rq.responseText) } };\n';
			result += 'rq.send(formData);';
			return result;
		},
		multipartRequest: function( params, url, method ) {
			var req = method.toUpperCase() + ' ' + url + ' HTTP/1.1';
			var boundary = '---------------------------' + Math.round( Math.random() * 17592186044416 );
			var body = '';
			req += '\r\nHost: ' + $( '<a>' )
				.attr( 'href', url )[ 0 ].hostname;
			req += '\r\nUser-Agent: ' + navigator.userAgent;
			req += '\r\nAccept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
			req += '\r\nReferer: ' + document.location.href;
			req += '\r\nContent-Length: \x08{{CONTENTLENGTH}}';
			req += '\r\nContent-Type: Content-Type: multipart/form-data; boundary=' + boundary;
			req += '\r\nPragma: no-cache';
			req += '\r\nCache-Control: no-cache';
			req += '\r\n\r\n';
			$.each( params, function( pName, p ) {
				body += '--' + boundary;
				if ( p.file ) {
					body += '\r\nContent-Disposition: form-data; name="' + pName + '"; filename="' + p.value + '"';
					body += '\r\nContent-Type: application/octet-stream';
					body += '\r\n\r\n' + p.fileData + '\r\n';
				} else {
					body += '\r\nContent-Disposition: form-data; name="' + pName + '"';
					body += '\r\n\r\n' + p.value + '\r\n';
				}
			} );
			body += '--' + boundary + '--' + '\r\n';
			req = req.replace( '\x08{{CONTENTLENGTH}}', body
				.replace( /[\u0080-\u07FF\uD800-\uDFFF]/g, '**' )
				.replace( /[\u0800-\uD7FF\uE000-\uFFFF]/g, '***' )
				.length );
			req += body;
			return req;
		},
		makeRequest: function( params, action ) {
			var $def = $.Deferred();
			var formData = new FormData();
			$.each( params, function( pName, p ) {
				if ( !p.file ) {
					formData.append( pName, p.value );
				} else {
					formData.append( pName, p.$input[ 0 ].files[ 0 ], p.value );
				}
			} );
			var rq = new XMLHttpRequest();
			rq.open( 'POST', $( '<a>' )
				.attr( 'href', action )
				.prop( 'href' ) );
			rq.onload = function() {
				if ( rq.status === 200 ) {
					$def.resolve( rq.responseText );
				}
			};
			rq.send( formData );
			return $def.promise();
		},
		displayJS: function( $form, jsCode ) {
			var $target = $form.next();
			if ( $target.attr( 'samplecode' ) === '1' ) {
				$target.text( 'JS example code:' );
			} else {
				$target = $( '<div>' )
					.text( 'JS example code:' )
					.attr( 'samplecode', '1' )
					.addClass( 'js-sample-code' )
					.insertAfter( $form );
			}
			$( '<pre>' )
				.append( $( '<code>' )
					.text( jsCode ) )
				.appendTo( $target );
		},
		displayMultipartRequest: function( $form, multipartRequest ) {
			var $target = $form.next()
				.next();
			if ( $target.attr( 'samplerequest' ) === '1' ) {
				$target.text( 'Request:' );
			} else {
				$target = $( '<div>' )
					.text( 'Request (multipart message):' )
					.attr( 'samplerequest', '1' )
					.addClass( 'req-sample-response' )
					.insertAfter( $form.next() );
			}
			$( '<pre>' )
				.text( multipartRequest )
				.appendTo( $target );
		},
		displayResult: function( $form, result ) {
			var $target = $form.next()
				.next()
				.next();
			if ( $target.attr( 'sampleresponse' ) === '1' ) {
				$target.text( 'Response:' );
			} else {
				$target = $( '<div>' )
					.text( 'Response:' )
					.attr( 'sampleresponse', '1' )
					.addClass( 'req-sample-response' )
					.insertAfter( $form.next()
						.next() );
			}
			$( '<pre>' )
				.text( result )
				.appendTo( $target );
		},
		cssThrobber: function() {
			var html = '',
				css = '';
			for ( var i = 0; i < 5; i++ ) {
				html += '<div class="rotSquare" id="rotSquare-' + i + '"></div>';
				css += '#rotSquare-' + i + ' { left: ' + ( 13 + ( i * 17 ) ) + '%; animation-delay: ' + ( 0.5 + i * 0.2 ) + 's; }\n';
			}
			html = '<div id="rotSquare">' + html + '</div>';
			css += '#rotSquare { position: relative; height: 22px; }\n';
			css += '.rotSquare { position: absolute; top: 0; background-color: #33c3f0; width: 22px; height: 25px; ' +
				'animation-name: bounce-rot-square; animation-duration: 1.4s; animation-iteration-count: infinite; ' +
				'animation-direction: normal; transform: scale(.25); }\n';
			css += '@keyframes bounce-rot-square { 0% { transform: scale(1); background-color: #33c3f0; }\n' +
				'100% { transform: scale(.3) rotate(90deg); background-color: #FFFFFF; } }';
			html += '<style>' + css + '</style>';
			return html;
		}
	};

	$( '.api-request' )
		.css( 'visibility', 'visible' )
		.click( validator.showRequest );

	$( '#doctype' ).change( function() {
		if ( /^SVG/.test( $( this ).val() ) ) {
			$( '.info' ).show();
		} else {
			$( '.info' ).hide();
		}
	} );

	$( 'form' )
		.submit( function( e ) {
			if ( !validator.validateInput( $( this ) ) ) {
				e.preventDefault();
			} else {
				$.blockUI( {
					message: validator.cssThrobber(),
					css: {
						'border': 'none',
						'padding': '20px'
					}
				} );
			}
		} );
}() );

