<?php
$tool_user_name = 'validator';
$formats_supported = array( 'json', 'soap12', 'html' );
$doctypes_supported = array( 'Inline', 'HTML5', 'XHTML 1.0 Strict', 'XHTML 1.0 Transitional',
	'XHTML 1.0 Frameset', 'HTML 4.01 Strict', 'HTML 4.01 Transitional', 'HTML 4.01 Frameset',
	'HTML 4.01 + RDFa 1.1', 'HTML 3.2', 'HTML 2.0', 'ISO/IEC 15445:2000 ("ISO HTML")', 'XHTML 1.1',
	'XHTML + RDFa', 'XHTML Basic 1.0', 'XHTML Basic 1.1', 'XHTML Mobile Profile 1.2', 'XHTML-Print 1.0',
	'XHTML 1.1 plus MathML 2.0', 'XHTML 1.1 plus MathML 2.0 plus SVG 1.1', 'MathML 2.0', 'SVG 1.0', 'SVG 1.1',
	'SVG 1.1 Tiny', 'SVG 1.1 Basic', 'SMIL 1.0', 'SMIL 2.0', );

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

if ( !array_key_exists( 'file', $_FILES ) ) {
	header( "Location: $url" );
	die();
}
$uploadName = $_FILES['file']['tmp_name'];

if ( $_FILES['file']['size'] > 5000000 ) {
	unlink( $uploadName );
	header( "Location: $url#tooBig" );
	die();
}

$output = array();
$format = ( isset( $_REQUEST['format'] ) ? $_REQUEST['format'] : '' );
if ( !in_array( $format, $formats_supported ) ) {
	$format = 'json';
}
switch ( $format ) {
	case 'json':
		header( 'Content-type: application/json; charset=utf-8' );
		break;
	case 'soap12':
		header( 'Content-type: application/xml; charset=utf-8' );
		break;
	case 'html':
		header( 'Content-type: text/html; charset=utf-8' );
		$format = '';
		break;
}
$formatArg = '';
if ( $format !== '' ) {
	$formatArg = ' output=' . escapeshellarg( $format );
}

$doctype = ( isset( $_REQUEST['doctype'] ) ? $_REQUEST['doctype'] : '' );
if ( !in_array( $doctype, $doctypes_supported ) ) {
        $doctype = '';
}
if ( $doctype !== '' ) {
        $doctype = ' doctype=' . escapeshellarg( $doctype );
}



exec( '/data/project/' . $tool_user_name . '/validator/cgi-bin/check' . $formatArg . $doctype . ' phpfile=' . escapeshellarg( $uploadName ), $output );
@unlink( $uploadName );
$output = implode( "\n", $output );
$outputParsed = array();
if ( $format === 'json' ) {
	if ( preg_match( '/(Content.+?[\dt]\n+)(\{.+\})/s', $output, $outputParsed ) ) {
		$header = explode( "\n", $outputParsed[1] );
		$output = $outputParsed[2];
		// Forward some headers
		foreach ( $header as $h  ) {
			if ( startsWith( $h, 'X-W3C-Validator' ) ) {
				header( $h );
			}
		}
	}
	if ( json_decode( $output ) === NULL ) {
		$output = json_encode( array( 'response' => $output ) );
	}
} else {
	if ( preg_match( '/(Content.+?[\dt]\n+)(\<.+\>)/s', $output, $outputParsed ) ) {
		$header = explode( "\n", $outputParsed[1] );
		$output = $outputParsed[2];
		// Forward some headers
		foreach ( $header as $h  ) {
			if ( startsWith( $h, 'X-W3C-Validator' ) ) {
				header( $h );
			}
		}
	}
}
header( 'Cache-Control: must-revalidate, post-check=0, pre-check=0' );

echo $output;

die();

