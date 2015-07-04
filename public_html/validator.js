/**
 *  This is validator.js
 */

( function() {
	'use strict';
	var validator = window.validator = {
		showRequest: function() {
			var $form = $( this )
				.closest( 'form' )
				.block({
					message: 'validating',
					css: { 'border': 'none' }
				}),
				action = $form.attr( 'action' ),
				method = $form.attr( 'method' );

			$( '.required-but-not-supplied' )
				.removeClass( 'required-but-not-supplied' );
			if ( !validator.validateInput( $form ) ) {
				return $form.unblock();
			}
			validator.getParams( $form )
				.done( function( params ) {
					var jsCode = validator.jsCode( params, action );
					validator.displayJS( $form, jsCode );
					validator
						.makeRequest( params, action )
						.done( function( r ) {
							validator.displayResult( $form, r );
							$form.unblock();
						} );
				} );
		},
		getParams: function( $form ) {
			var $inputs = $form.find( 'input,select' ),
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
						if (reader.readAsBinaryString) {
							reader.readAsBinaryString( $input[ 0 ].files[ 0 ] );
						} else  if (reader.readAsText) {
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
		jsCode: function( params, action ) {
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
			result += 'rq.open("POST", "' + $( '<a>' )
				.attr( 'href', action )
				.prop( 'href' ) + '");\n';
			result += 'rq.onload = function(oEvent) { if (rq.status === 200) { console.log(rq.responseText) } };\n';
			result += 'rq.send(formData);';
			return result;
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
		displayResult: function( $form, result ) {
			var $target = $form.next()
				.next();
			if ( $target.attr( 'sampleresponse' ) === '1' ) {
				$target.text( 'Response:' );
			} else {
				$target = $( '<div>' )
					.text( 'Response:' )
					.attr( 'sampleresponse', '1' )
					.addClass( 'req-sample-response' )
					.insertAfter( $form.next() );
			}
			$( '<pre>' )
				.text( result )
				.appendTo( $target );
		},
		displayJS: function( $form, jsCode ) {
			var $target = $form.next();
			if ( $target.attr( 'samplerequest' ) === '1' ) {
				$target.text( 'JS example code:' );
			} else {
				$target = $( '<div>' )
					.text( 'JS example code:' )
					.attr( 'samplerequest', '1' )
					.addClass( 'js-sample-code' )
					.insertAfter( $form );
			}
			$( '<pre>' )
				.append( $('<code>').text( jsCode ) )
				.appendTo( $target );
		}
	};

	$( '.api-request' )
		.css( 'visibility', 'visible' )
		.click( validator.showRequest );

	$( 'form' )
		.submit( function( e ) {
			if ( !validator.validateInput( $( this ) ) ) {
				e.preventDefault();
			}
		} );
}() );

