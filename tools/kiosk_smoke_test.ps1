param(
  [ValidateSet("rush", "duel")]
  [string]$Game = "duel",
  [int]$Port = 3102
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$UsbRoot = $Root
$Page = if ($Game -eq "duel") { "bridge-duel-standalone.html" } else { "harbor-rush-standalone.html" }
$Button = if ($Game -eq "duel") { "startButton" } else { "startButton" }
$OverlayExpression = if ($Game -eq "duel") {
  "getComputedStyle(document.getElementById('startOverlay')).display"
} else {
  "document.getElementById('gameScreen').classList.contains('active') ? 'game' : 'not-game'"
}

$ChromeCandidates = @(
  "C:\Program Files\Google\Chrome\Application\chrome.exe",
  "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
)
$Chrome = $ChromeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $Chrome) {
  throw "Chrome or Edge was not found."
}

$env:PORT = [string]$Port
$env:HOST = "127.0.0.1"
$Server = Start-Process -FilePath node -ArgumentList "server.js" -WorkingDirectory $UsbRoot -PassThru -WindowStyle Hidden
$UserData = Join-Path $env:TEMP ("ctk-smoke-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $UserData | Out-Null
$DebugPort = 9224
$Browser = Start-Process -FilePath $Chrome -ArgumentList @("--headless=new", "--disable-gpu", "--remote-debugging-port=$DebugPort", "--user-data-dir=$UserData", "about:blank") -PassThru -WindowStyle Hidden

try {
  Start-Sleep -Seconds 2
  $Url = "http://127.0.0.1:${Port}/${Page}?v=smoke"
  $Tab = Invoke-RestMethod -Method Put "http://127.0.0.1:$DebugPort/json/new?about:blank"
  $Socket = [System.Net.WebSockets.ClientWebSocket]::new()
  $Socket.ConnectAsync([Uri]$Tab.webSocketDebuggerUrl, [Threading.CancellationToken]::None).Wait()

  function Send-Cdp([int]$Id, [string]$Method, $Params) {
    $Object = @{ id = $Id; method = $Method }
    if ($Params) { $Object.params = $Params }
    $Json = $Object | ConvertTo-Json -Depth 12 -Compress
    $Bytes = [Text.Encoding]::UTF8.GetBytes($Json)
    $Segment = [ArraySegment[byte]]::new($Bytes)
    $Socket.SendAsync($Segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).Wait()
  }

  function Read-Cdp {
    $Buffer = New-Object byte[] 65536
    $Segment = [ArraySegment[byte]]::new($Buffer)
    $Result = $Socket.ReceiveAsync($Segment, [Threading.CancellationToken]::None).Result
    [Text.Encoding]::UTF8.GetString($Buffer, 0, $Result.Count)
  }

  Send-Cdp 1 "Runtime.enable" $null
  Send-Cdp 2 "Page.enable" $null
  Send-Cdp 3 "Page.navigate" @{ url = $Url }
  Start-Sleep -Milliseconds 1800
  Send-Cdp 4 "Runtime.evaluate" @{ expression = "document.readyState + '|' + location.href + '|' + !!document.getElementById('$Button')"; returnByValue = $true }
  do { $Ready = Read-Cdp } until ($Ready -match '"id":4')
  Write-Output $Ready
  Send-Cdp 5 "Runtime.evaluate" @{ expression = "document.getElementById('$Button').click(); 'clicked'"; returnByValue = $true }
  do { $Out = Read-Cdp } until ($Out -match '"id":5')
  Start-Sleep -Milliseconds 1200
  Send-Cdp 6 "Runtime.evaluate" @{ expression = "({state:$OverlayExpression, canvasW:document.querySelector('canvas').width, canvasH:document.querySelector('canvas').height})"; returnByValue = $true }
  do { $Result = Read-Cdp } until ($Result -match '"id":6')
  Write-Output $Result

  if ($Result -notmatch '"canvasH":(?!0|1)\d+') {
    throw "Smoke test failed: canvas height is not valid."
  }

  if ($Game -eq "duel" -and $Result -notmatch '"state":"none"') {
    throw "Smoke test failed: duel start overlay did not close."
  }

  if ($Game -eq "rush" -and $Result -notmatch '"state":"game"') {
    throw "Smoke test failed: Harbor Rush did not enter game screen."
  }

  Write-Output "Smoke test passed for $Game."
} finally {
  if ($Socket) { $Socket.Dispose() }
  Stop-Process -Id $Browser.Id -Force -ErrorAction SilentlyContinue
  Stop-Process -Id $Server.Id -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $UserData -Recurse -Force -ErrorAction SilentlyContinue
}
