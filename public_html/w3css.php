<?php
$tool_user_name = 'validator';
$formats_supported = array( 'text/html', 'html', 'application/xhtml+xml', 'xhtml', 'application/soap+xml', 'soap12', 'text/plain', 'text', 'json' );
$profile_supported = array( 'none', 'css1', 'css2', 'css21', 'css3', 'svg', 'svgbasic', 'svgtiny', 'mobile', 'atsc-tv', 'tv' );
$lang_supported = array( 'en', 'fr', 'it', 'ko', 'ja', 'es', 'zh-cn', 'nl', 'de' );
$medium_supported = array( 'all', 'aural', 'braille', 'embossed', 'handheld', 'print', 'projection', 'screen', 'tty', 'tv', 'presentation' );
$input_supported = array( 'css', 'html', 'htm', 'shtml', 'xhtml', 'xml' );
$warning_supported = array( '0', '1', '2' );
$allowed_headers = array( 'vextwarning', 'output', 'lang', 'warning', 'medium', 'profile' );

include_once ( 'shared/common.php' ) ;
// error_reporting( E_ALL & ~E_NOTICE ); # Don't clutter the directory with unhelpful stuff

function startsWith( $haystack, $needle ) {
	// search backwards starting from haystack length characters from the end
	return $needle === "" || strrpos( $haystack, $needle, -strlen( $haystack ) ) !== FALSE;
}
function endsWith( $haystack, $needle ) {
	// search forward starting from end minus needle length characters
	return $needle === "" || ( ( $temp = strlen( $haystack ) - strlen( $needle ) ) >= 0 && strpos( $haystack, $needle, $temp ) !== FALSE );
}

$prot = getProtocol();
$url = $prot . "://tools.wmflabs.org/$tool_user_name/";

if ( array_key_exists( 'HTTP_ORIGIN', $_SERVER ) ) {
	$origin = $_SERVER['HTTP_ORIGIN'];
}

// Response Headers
header( 'Content-type: application/json; charset=utf-8' );
header( 'Cache-Control: private, s-maxage=0, max-age=0, must-revalidate' );
header( 'x-content-type-options: nosniff' );
header( 'X-Frame-Options: SAMEORIGIN' );
header( 'X-API-VERSION: 0.0.0.0' );

if ( isset( $origin ) ) {
	// Check protocol
	$protOrigin = parse_url( $origin, PHP_URL_SCHEME );
	if ( $protOrigin != $prot ) {
		header( 'HTTP/1.0 403 Forbidden' );
		if ( 'https' == $protOrigin ) {
			echo '{"error":"Please use this service over https."}';
		} else {
			echo '{"error":"Please use this service over http."}';
		}
		exit;
	}

	// Do we serve content to this origin?
	if ( matchOrigin( $origin ) ) {
		header( 'Access-Control-Allow-Origin: ' . $origin );
		header( 'Access-Control-Allow-Methods: POST, GET, OPTIONS' );
	} else {
		header( 'HTTP/1.0 403 Forbidden' );
		echo '{"error":"Accessing this tool from the origin you are attempting to connect from is not allowed."}';
		exit;
	}
}

$fileName = '';
$fileExtension = 'css';

if ( !array_key_exists( 'file', $_FILES ) ) {
	if ( !array_key_exists( 'file', $_POST ) ) {
		header( "Location: $url#nofile" );
		die();
	}
	if ( strlen( $_POST['file'] ) > 5000000 ) {
		header( "Location: $url#tooBig" );
		die();
	}
	$fileName = tempnam( sys_get_temp_dir(), 'validator-css-' );
	@unlink( $fileName );
	if ( isset( $_REQUEST['file-extension'] ) && in_array( $_REQUEST['file-extension'], $input_supported ) ) {
		$fileExtension = $_REQUEST['file-extension'];
	} else {
		header( 'X-API-WARNING: File submitted through POST and no or unsupported file-extension specified - assuming css' );
	}
	$fileName .= '.' . $fileExtension;
	if ( file_put_contents( $fileName, $_POST['file'] ) === false ) {
		@unlink( $fileName );
		header( "Location: $url#cantwrite" );
		die();
	} ;
} else {
	$uploadName = $_FILES['file']['tmp_name'];
	$fileExtension = end( explode( '.', $_FILES['file']['name'] ) );
	if ( !in_array( $fileExtension, $input_supported ) ) {
		header( 'X-API-WARNING: File submitted does not have a supported file extension - assuming css' );
		$fileExtension = 'css';
	}
	$fileName .= '.' . $fileExtension;

	if ( $_FILES['file']['size'] > 5000000 ) {
		unlink( $uploadName );
		header( "Location: $url#tooBig" );
		die();
	}

	if ( !move_uploaded_file( $uploadName, $fileName ) ) {
		unlink( $uploadName );
		header( "Location: $url#cantmove" );
		echo( 'cant move uploaded file' );
		die();
	}
}

$output = array();
$format = ( isset( $_REQUEST['format'] ) ? $_REQUEST['format'] : '' );
if ( !in_array( $format, $formats_supported ) ) {
	$format = 'json';
}
switch ( $format ) {
	case 'json':
	case 'application/json':
		header( 'Content-type: application/json; charset=utf-8' );
		break;
	case 'soap12':
	case 'application/soap+xml':
		header( 'Content-type: application/soap+xml; charset=utf-8' );
		break;
	case 'html':
	case 'text/html':
		header( 'Content-type: text/html; charset=utf-8' );
		$format = '';
		break;
	case 'xhtml':
	case 'application/xhtml+xml':
		header( 'Content-type: application/xhtml+xml; charset=utf-8' );
		break;
	case 'text':
	case 'text/plain':
		header( 'Content-type: text/plain; charset=utf-8' );
		break;
}
$formatArg = '';
if ( $format !== '' ) {
	$formatArg = ' --output=' . escapeshellarg( $format );
}

$profile = ( isset( $_REQUEST['profile'] ) ? $_REQUEST['profile'] : '' );
if ( !in_array( $profile, $profile_supported ) ) {
        $profile = '';
}
if ( $profile !== '' ) {
        $profile = ' --profile=' . escapeshellarg( $profile );
}

$lang = ( isset( $_REQUEST['lang'] ) ? $_REQUEST['lang'] : '' );
if ( !in_array( $lang, $lang_supported ) ) {
        $lang = '';
}
if ( $lang !== '' ) {
        $lang = ' --lang=' . escapeshellarg( $lang );
}

$medium = ( isset( $_REQUEST['medium'] ) ? $_REQUEST['medium'] : '' );
if ( !in_array( $medium, $medium_supported ) ) {
        $medium = '';
}
if ( $medium !== '' ) {
        $medium = ' --medium=' . escapeshellarg( $medium );
}

$warning = ( isset( $_REQUEST['warning'] ) ? $_REQUEST['warning'] : '' );
if ( !in_array( $warning, $warning_supported ) ) {
        $warning = '';
}
if ( $warning !== '' ) {
        $warning = ' --warning=' . escapeshellarg( $warning );
}

exec( 'java -Xms1G -jar /data/project/' . $tool_user_name . '/java/css-validator/css-validator.jar' . $formatArg . $profile . $lang . $medium . $warning . ' file:' . $fileName, $output );
@unlink( $fileName );
$output = implode( "\n", $output );

$outputParsed = array();
if ( $format === 'json' ) {
	if ( preg_match( '/\{(.+?)\}\n*(\{.+\})/s', $output, $outputParsed ) ) {
		$params = $outputParsed[1];
		$output = $outputParsed[2];
	}
	if ( json_decode( $output ) === NULL ) {
		$output = json_encode( array( 'response' => $output ) );
	}
} else {
	if ( preg_match( '/^\{(.+?)\}(.+)$/s', $output, $outputParsed ) ) {
		$params = $outputParsed[1];
		$output = $outputParsed[2];
	}
}
if ( isset( $params ) ) {
	$params = explode( " ", $params );
	foreach ( $params as $p ) {
		$p = explode( "=", $p );
		if ( count( $p ) > 1 && in_array( $p[0], $allowed_headers ) ) {
			header( 'X-CSS-Validator-' . $p[0] . ': ' . str_replace( ',', '', $p[1] ) );
		}
	}
}
header( 'Cache-Control: must-revalidate, post-check=0, pre-check=0' );

echo str_replace( 'file:' . $fileName, '/WMFTempstore/toValidate.' . $extension, $output );

die();

