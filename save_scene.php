<?php
/**
 * Created by PhpStorm.
 * User: ekim
 * Date: 2018-12-14
 * Time: 18:59
 */
file_put_contents("./scenes/".$_POST["scene_name"].".txt", $_POST["scene_data"]);

echo json_encode(array("result" => "good"));
