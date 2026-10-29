<?php

// =====================================================
// ERROR REPORTING & MYSQLI EXCEPTIONS HANDLING
// =====================================================
ini_set('display_errors', '0');
error_reporting(E_ALL);
mysqli_report(MYSQLI_REPORT_OFF);


// =====================================================
// CORS
// =====================================================

$allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost',
    'http://127.0.0.1:5173',
    'http://wzpocs.in',
    'https://wzpocs.in',
    'http://hiranandaniwestgatereserve.com/',
    'https://hiranandaniwestgatereserve.com/',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type");
    header("Access-Control-Allow-Credentials: true");
} else if (!empty($origin)) {
    // Dynamic origin fallback for deployment domains
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type");
} else {
    header("Access-Control-Allow-Origin: *");
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}


// =====================================================
// RESPONSE HEADER
// =====================================================

header('Content-Type: application/json; charset=utf-8');


// =====================================================
// FUNCTION TO GET CLIENT IP ADDRESS
// =====================================================

function getClientIP()
{
    if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
        return $_SERVER['HTTP_CF_CONNECTING_IP'];
    }

    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        return trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
    }

    if (!empty($_SERVER['REMOTE_ADDR'])) {
        return $_SERVER['REMOTE_ADDR'];
    }

    return '';
}


// =====================================================
// FACEBOOK / INSTAGRAM GRAPH API LOOKUP HELPER
// Ported from thankyou.php
// =====================================================

function fetchFbAdDetails($ad_id)
{

    $result = [
        'ad_name' => '',
        'adset_name' => '',
        'campaign_name' => '',
    ];

    if (empty($ad_id)) {
        return $result;
    }

    $fb_access_token = 'EAAFi6rjzjmUBO4ZANwI5ZBvpCWCMoEb6kIzFSKsWAQlFBfqf2ee7OGo6zu8NVhX7vAZCeVJK3KulX9JZAZAjvoZAEonP5Rgzix0ZAOLqKTwqOe99M4AAlVqddw4OyzivJBH7xZBNCDNC0SHH0HvZCNhaiVcQnbqOrgRv2Ky6zSxcWDdNieuD5OHyUPFfh';

    $fb_url = 'https://graph.facebook.com/v23.0/' . urlencode($ad_id)
        . '?fields=' . urlencode('name,adset{name},campaign{name}')
        . '&access_token=' . $fb_access_token;

    $fb_curl = curl_init();
    curl_setopt_array($fb_curl, [
        CURLOPT_URL => $fb_url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => '',
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => 'GET',
        CURLOPT_SSL_VERIFYPEER => false,
    ]);

    $fb_response = curl_exec($fb_curl);
    curl_close($fb_curl);

    if ($fb_response !== false) {
        $fb_data = json_decode($fb_response, true);

        if (!empty($fb_data['name'])) {
            $result['ad_name'] = $fb_data['name'];
        }
        if (!empty($fb_data['adset']['name'])) {
            $result['adset_name'] = $fb_data['adset']['name'];
        }
        if (!empty($fb_data['campaign']['name'])) {
            $result['campaign_name'] = $fb_data['campaign']['name'];
        }
    }

    return $result;
}


// =====================================================
// DATABASE CONNECTION (WITH ENVIRONMENT FALLBACK)
// =====================================================

$dbConfigs = [
    ['localhost', 'root', 'Webadmin@931!!', 'test_westgate_react3d'],

];

// Local development only (XAMPP / WAMP / MAMP / `php -S` on this machine).
// True only when the request comes from this same machine (loopback) AND was
// addressed to localhost, so these entries are never used on the live server.
$requestHost = strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
$isLocalhost = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)
    && in_array($requestHost, ['localhost', '127.0.0.1', '[::1]'], true);

if ($isLocalhost) {
    $dbConfigs = [
        ['localhost', 'root', '', 'test_westgate_react3d'],     // XAMPP / WAMP default
        ['localhost', 'root', 'root', 'test_westgate_react3d'], // MAMP default
    ];
}

$con = null;
$db_error = '';

foreach ($dbConfigs as $cfg) {
    try {
        $c = @mysqli_connect($cfg[0], $cfg[1], $cfg[2], $cfg[3]);
        if ($c) {
            $con = $c;
            break;
        } else {
            $db_error = mysqli_connect_error();
        }
    } catch (\Throwable $e) {
        $db_error = $e->getMessage();
    }
}

if (!$con) {
    echo json_encode([
        "status" => 0,
        "msg" => "Database connection failed",
        "error" => $db_error
    ]);
    exit;
}

// Make sure ₹ and other Unicode characters are stored correctly
mysqli_set_charset($con, "utf8mb4");


// =====================================================
// ONLY POST REQUEST ALLOWED
// =====================================================

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        "status" => 0,
        "msg" => "Request method not accepted"
    ]);
    exit;
}


// =====================================================
// GET JSON DATA
// =====================================================

$rawData = file_get_contents("php://input");
$data = json_decode($rawData, true);

if (!is_array($data)) {
    if (!empty($_POST)) {
        $data = $_POST;
    } else {
        echo json_encode([
            "status" => 0,
            "msg" => "Invalid JSON data",
            "raw_data" => $rawData
        ]);
        exit;
    }
}


// =====================================================
// BASIC LEAD DATA
// =====================================================

$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$rawMobile = $data['mobile'] ?? '';
$mobile = substr(preg_replace('/\D/', '', (string) $rawMobile), -10);
$countrycode = trim($data['countrycode'] ?? $data['country_code'] ?? '+91');
$ip_address = getClientIP();


// =====================================================
// SOURCE DATA
// =====================================================

$campaignsource = $data['utm_source'] ?? $data['campaignsource'] ?? '';
$campaignsubsource = $data['utm_sub_source'] ?? $data['campaignsubsource'] ?? '';
$placement = $data['Lead_Placement'] ?? $data['lead_placement'] ?? $data['placement'] ?? $data['utm_placement'] ?? '';
$device = $data['Lead_Device'] ?? $data['lead_device'] ?? $data['device'] ?? $data['utm_device'] ?? '';
$adset = $data['utm_adgroupname'] ?? $data['adgroupname'] ?? $data['utm_adset'] ?? $data['adset'] ?? '';
$keyword = $data['Lead_Keyword'] ?? $data['lead_keyword'] ?? $data['keyword'] ?? $data['utm_keyword'] ?? '';
$gclid = $data['gclid'] ?? '';
$utmM = $data['utm_medium'] ?? $data['utmM'] ?? '';
$utmC = $data['utm_campaignname'] ?? $data['campaignname'] ?? '';


// =====================================================
// CAMPAIGN DATA
// =====================================================

$campaigncode = $data['campaigncode'] ?? '';
$campaignname = $data['utm_campaignname'] ?? $data['campaignname'] ?? '';

// Google Campaign ID
$mf_campaignid = $data['utm_campaignid'] ?? $data['campaignid'] ?? $data['gad_campaignid'] ?? '';


// =====================================================
// FORM DATA
// =====================================================

$form_id = !empty($data['form_id']) ? $data['form_id'] : 'PopupForm';
$leadgen_id = $data['leadgen_id'] ?? '';
$page_id = $data['page_id'] ?? '';
$ad_id = $data['utm_adgroupid'] ?? $data['adgroupid'] ?? $data['ad_id'] ?? '';
$adcreative = $data['utm_adname'] ?? $data['adname'] ?? $data['utm_adcreative'] ?? $data['creative'] ?? '';
$capturefromname = $data['formname'] ?? $data['capturefromname'] ?? 'More Information Form';

// Default website name for Westgate project
$websitename = $data['websitename'] ?? 'House of Hiranandani Westgate';


// =====================================================
// PROJECT DATA
// =====================================================

$projectSelectValues = $data['projectSelectValues'] ?? 'Hiranandani Westgate';


// =====================================================
// CONFIGURATION ARRAYS
// =====================================================

$configInterestValues = $data['configInterestValues'] ?? [];
$purposeValues = $data['purposeValues'] ?? [];
$visitdayValues = $data['visitdayValues'] ?? [];
$favdestinationValues = $data['favdestinationValues'] ?? [];
$configTypeValues = $data['configTypeValues'] ?? [];


// =====================================================
// GET FIRST VALUE FROM ARRAYS
// =====================================================

$bhktype = $configInterestValues[0] ?? ($data['bhktype'] ?? '');
$purpose = $purposeValues[0] ?? ($data['purpose'] ?? '');
$visitpossibleon = $visitdayValues[0] ?? ($data['visitpossibleon'] ?? '');
$favdestination = $favdestinationValues[0] ?? ($data['favdestination'] ?? '');
$villatype = $configTypeValues[0] ?? ($data['villatype'] ?? '');


// =====================================================
// OTHER DATA
// =====================================================

$duplicate = $data['duplicate'] ?? '';
// =====================================================
// GENERATE UNIQUE ID
// Format: WESTGATERES0001, WESTGATERES0002, ...
// =====================================================

$lastuniqueidQuery = "
    SELECT uniqueid
    FROM `lead`
    WHERE uniqueid IS NOT NULL
      AND uniqueid LIKE 'WESTGATERES%'
    ORDER BY id DESC
    LIMIT 1
";

$lastuniqueidResult = $con->query($lastuniqueidQuery);

if ($lastuniqueidResult && $lastuniqueidResult->num_rows > 0) {

    $row = $lastuniqueidResult->fetch_assoc();

    $lastuniqueid = $row['uniqueid'];

    // Get only the numeric part
    $number = preg_replace('/\D/', '', $lastuniqueid);

    // If numeric part is empty, start from 1
    if ($number === '') {
        $number = 0;
    }

    $nextNumber = str_pad(
        ((int)$number) + 1,
        4,
        '0',
        STR_PAD_LEFT
    );

    $uniqueid = 'WESTGATERES' . $nextNumber;

} else {

    $uniqueid = 'WESTGATERES0001';
}


// =====================================================
// UTM DATA DEFAULTS & NORMALIZATION
// =====================================================

if ($campaigncode == NULL || $campaigncode === '') {
    $campaigncode = "FY26_27";
}
if ($campaignname == NULL || $campaignname === '') {
    $campaignname = "Location";
}
$utmC = $campaignname;

if ($campaignsource == NULL || $campaignsource === '') {
    $campaignsource = "Google";
}
if ($campaignsubsource == NULL || $campaignsubsource === '') {
    $campaignsubsource = "Search";
}
if ($utmM == NULL || $utmM === '') {
    $utmM = "cpc";
}

if ($campaigncode == "FY25_26_NRI") {
    $SourceGrouping = "NRI Digital";
} else {
    $SourceGrouping = "Digital";
}


// =====================================================
// FACEBOOK / INSTAGRAM AD ENRICHMENT
// =====================================================

$fb_ad_id = ($data['ad_id'] ?? '') ?: ($data['utm_content'] ?? '') ?: $ad_id;
$ad_name = '';
$adset_name = '';
$campaign_name = '';

if (!empty($fb_ad_id) && in_array(strtolower($campaignsource), ['ig', 'fb', 'instagram', 'facebook'])) {
    $fbDetails = fetchFbAdDetails($fb_ad_id);
    $ad_name = $fbDetails['ad_name'];
    $adset_name = $fbDetails['adset_name'];
    $campaign_name = $fbDetails['campaign_name'];
}

if ($ad_name === '') {
    $ad_name = $adcreative;
}
// =====================================================
// VALIDATE LEAD
// =====================================================

if ($mobile === '' && $email === '') {
    echo json_encode([
        "status" => 0,
        "msg" => "Mobile or Email is required"
    ]);
    exit;
}


// =====================================================
// INSERT LEAD
// =====================================================

$sql = "INSERT INTO `lead`
(
    name,
    email,
    countrycode,
    mobile,
    campaignsource,
    campaignsubsource,
    placement,
    device,
    adset,
    bhktype,
    purpose,
    visitpossibleon,
    favdestination,
    villatype,
    projinterest,
    form_id,
    ad_id,
    leadgen_id,
    page_id,
    keyword,
    capturefromname,
    websitename,
    createddate,
    utmM,
    utmC,
    duplicate,
    campaign_name,
    mf_campaignid,
    uniqueid,
    gclid,
    ip_address,
    ad_name,
    adset_name
)
VALUES
(
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
    NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
)";

$stmt = mysqli_prepare($con, $sql);

if (!$stmt) {
    echo json_encode([
        "status" => 0,
        "msg" => "SQL prepare failed",
        "error" => mysqli_error($con)
    ]);
    exit;
}

mysqli_stmt_bind_param(
    $stmt,
    "ssssssssssssssssssssssssssssssss",
    $name,
    $email,
    $countrycode,
    $mobile,
    $campaignsource,
    $campaignsubsource,
    $placement,
    $device,
    $adset,
    $bhktype,
    $purpose,
    $visitpossibleon,
    $favdestination,
    $villatype,
    $projectSelectValues,
    $form_id,
    $ad_id,
    $leadgen_id,
    $page_id,
    $keyword,
    $capturefromname,
    $websitename,
    $utmM,
    $utmC,
    $duplicate,
    $campaignname,
    $mf_campaignid,
    $uniqueid,
    $gclid,
    $ip_address,
    $ad_name,
    $adset_name
);

if (!mysqli_stmt_execute($stmt)) {
    echo json_encode([
        "status" => 0,
        "msg" => "Error adding lead",
        "error" => mysqli_stmt_error($stmt)
    ]);
    mysqli_stmt_close($stmt);
    mysqli_close($con);
    exit;
}

$last_insertid = mysqli_insert_id($con);
mysqli_stmt_close($stmt);


// =====================================================
// SPERTO / HOUSE OF HIRANANDANI (HOH) LEAD INTEGRATION
// =====================================================

$api_key = "WEBZAA-25052022-HDIK7-DGDDT-UITQW";
$lead_category = "O";

// Westgate Campaign Key (CID)
$defaultCid = '202610050528241141431222381514422776ac390e0ccbd3427443586';

$cid = trim((string)($data['cid'] ?? $data['campaign_key'] ?? ''));

if ($cid === '' || in_array(strtolower($cid), ['undefined', 'null'], true)) {
    $cid = $defaultCid;
}

$pageLabel = $data['subject'] ?? $data['page_url'] ?? 'https://hiranandaniwestgatereserve.com/';
$isdCode = $countrycode ? str_replace('+', '', $countrycode) : '91';

$spertoPayload = [
    "api_key" => $api_key,
    "lead_category" => $lead_category,
    "uniquerefno" => $uniqueid,
    "campaign_key" => $cid,
    "customer_name" => $name,
    "mobile1_isd" => $isdCode,
    "mobile_no1" => $mobile,
    "guid" => $gclid,
    "email_id1" => $email,
    "ad_group_name" => $adset,
    "ad_keywords" => $keyword,
    "ad_campaign_name" => $campaign_name ?: ($campaignname ?: $campaignsource),
    "page_url" => $pageLabel,
    "lead_provider" => $campaignsource ?: 'Google'
];

$spertoResponse = false;
$spertoCurlError = '';
$spertoHttpCode = 0;

// The lead is already saved in the DB at this point, so a CRM/cURL problem
// must never turn into a failed response for the visitor.
try {
    if ($isLocalhost) {
        // Don't push local test leads into the live HOH presales CRM.
        throw new \RuntimeException('skipped on localhost');
    }

    $sperto_curl = curl_init();

    curl_setopt_array($sperto_curl, [
        CURLOPT_URL => 'https://presales.myhoh.in/_api/api_auth_post_lead_json.php',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => '',
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => 'POST',
        CURLOPT_POSTFIELDS => json_encode($spertoPayload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER => [
            'Content-Type: text/plain'
        ],
        CURLOPT_SSL_VERIFYPEER => false,
    ]);

    $spertoResponse = curl_exec($sperto_curl);
    $spertoCurlError = curl_error($sperto_curl);
    $spertoHttpCode = curl_getinfo($sperto_curl, CURLINFO_HTTP_CODE);

    curl_close($sperto_curl);
} catch (\Throwable $e) {
    $spertoCurlError = $e->getMessage();
}



// =====================================================
// STORE SPERTO RESPONSE
// =====================================================

$curlresponse = is_string($spertoResponse) ? $spertoResponse : ('curl_error: ' . $spertoCurlError);

$update = $con->prepare(
    "UPDATE `lead`
     SET curlresponse = ?
     WHERE id = ?"
);

if ($update) {
    $update->bind_param(
        "si",
        $curlresponse,
        $last_insertid
    );
    $update->execute();
    $update->close();
}


// =====================================================
// FINAL RESPONSE
// =====================================================

$json = [
    "status" => 1,
    "msg" => "Lead added successfully",
    "lead_id" => $last_insertid,
    "sperto_http_code" => $spertoHttpCode,
    "sperto_error" => $spertoCurlError,
    "received_data" => [
        "name" => $name,
        "email" => $email,
        "mobile" => $mobile,
        "countrycode" => $countrycode,
        "cid" => $cid,
        "utm_source" => $campaignsource,
        "utm_sub_source" => $campaignsubsource,
        "utm_medium" => $utmM,
        "utm_campaignname" => $campaignname,
        "utm_campaignid" => $mf_campaignid,
        "utm_adgroupname" => $adset,
        "utm_adgroupid" => $ad_id,
        "utm_adname" => $adcreative,
        "gclid" => $gclid,
        "Lead_Keyword" => $keyword,
        "Lead_Placement" => $placement,
        "Lead_Device" => $device,
        "websitename" => $websitename
    ]
];


// =====================================================
// CLOSE DATABASE
// =====================================================

mysqli_close($con);


// =====================================================
// RETURN JSON
// =====================================================

echo json_encode(
    $json,
    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
);

?>
