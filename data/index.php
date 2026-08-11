<?php

/**
 * Front controller for the game's AJAX endpoints.
 *
 * .htaccess rewrites /<name>.json here, and the client selects a handler with
 * the `a` (action) and `b` (directory) parameters.
 *
 * Those two values used to be concatenated straight into include(), so any
 * caller could walk the filesystem with `a=../../whatever` and execute an
 * arbitrary .php file on the server. The handler is now resolved against the
 * real files on disk and confined to the whitelisted directories below.
 */

include_once('../templates/config.php');
include_once('../templates/ducnghia.php');
include_once('../templates/includes/Array2XML.php');

/** Directories that may be addressed through the `b` parameter. */
const HANDLER_DIRECTORIES = ['game'];

$directory = (string) ($_POST['b'] ?? $_GET['b'] ?? 'game');
$action    = (string) ($_POST['a'] ?? $_GET['a'] ?? '');

if ($action === '') {
    echo 'DucNghia : error';
    exit();
}

if (!in_array($directory, HANDLER_DIRECTORIES, true)) {
    http_response_code(404);
    echo 'DucNghia : error';
    exit();
}

// A handler name is a plain file name: no separators, no traversal, no dots.
if (preg_match('/^[A-Za-z0-9_-]{1,64}$/', $action) !== 1) {
    http_response_code(404);
    echo 'DucNghia : error';
    exit();
}

$handler = __DIR__ . '/' . $directory . '/' . $action . '.php';
$real    = realpath($handler);
$base    = realpath(__DIR__ . '/' . $directory);

// realpath() resolves symlinks too, so a link planted inside the handler
// directory cannot point back out of it.
if ($real === false || $base === false || !str_starts_with($real, $base . DIRECTORY_SEPARATOR)) {
    http_response_code(404);
    echo 'DucNghia : error';
    exit();
}

include($real);
