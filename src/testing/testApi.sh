# Run in Terminal and follow prompts to test API
# Uses cURL

# Use predefined vars, any blank vars will be asked for before each test
test_protocol=""          # http/https
test_domain="localhost"   # Set IP/domain
test_port=""              # Set PORT
test_token=""             # Auth token
test_access="rw"          # Expected token access
test_path="api/base"      # URL path to test
test_key="data"           # Data key @ test_path to test setting/changing

# Additional options (These can only be set here)
test_SSL=0                # Test TLS/SSL certificate's authenticity (Set to 0 for self-signed cert, ie. for dev enviroment)
id_key="id"               # ID key for test model (Should normally be "id")

runTests() {
  # callApi(): callApi [description] [GET|POST|PULL|DELETE|etc] [url-suffix] [request.body] [response should include]

  # These values should be assignable to test_key
  local val1="TEST"
  local val2="NEW"

  local update_res="{\"changed\":"

  # CREATE -- readonly = fails (NO id/entry)
  local res=$([[ "$test_access" == *"w"* ]] && echo "" || echo "\"error\":")
  callApi "Create entry" "POST" "" "{\"${test_key}\":\"${val1}\"}" "$res"
  
  local id=$([[ "$test_res" != *"\"error\":"* ]] && getVal "$test_res" "$id_key" || echo "")

  # READ -- writeonly = fails
  res=$([[ "$test_access" == "r" ]] && echo "" || echo "\"error\":")
  [[ "$test_access" == "rw" ]] && res="\"${test_key}\":\"${val1}\""
  callApi "Read entry" "GET" "$id" "" "$res"

  # READ ALL -- not read/write = skips
  [[ "$test_access" == "rw" ]] && callApi "Read all entries" "GET" "" "" "\"${test_key}\":\"${val1}\""

  # UPDATE -- readonly = fails
  [[ "$test_access" == *"w"* ]] && callApi "Update entry" "PUT" "$id" "{\"${test_key}\":\"${val2}\"}" "$update_res"

  # CHECK UPDATE -- not read/write = skips
  [[ "$test_access" == "rw" ]] && callApi "Check update" "GET" "$id" "" "\"${test_key}\":\"${val2}\""

  # CREATE SWAP -- readonly = fails (NO id/entry)
  [[ "$test_access" == *"w"* ]] && callApi "Create swap entry" "POST" "" "{\"${test_key}\":\"${val1}\"}" "\"${id_key}\":"
  local swap=$([[ "$test_res" != *"\"error\":"* ]] && getVal "$test_res" "$id_key" || echo "")

  # SWAP -- readonly = fails
  [[ "$test_access" == *"w"* ]] && callApi "Swap entries" "POST" "swap" "{\"${id_key}\":\"${id}\",\"swap\":\"${swap}\"}" "$update_res"

  # CHECK SWAP -- not read/write = skips
  [[ "$test_access" == "rw" ]] && callApi "Check swap [$id]" "GET" "$id" "" "\"${test_key}\":\"${val1}\""
  [[ "$test_access" == "rw" ]] && callApi "Check swap [$swap]" "GET" "$swap" "" "\"${test_key}\":\"${val2}\""

  # DELETE SWAP -- readonly = fails
  [[ "$test_access" == *"w"* ]] && callApi "Delete swap" "DELETE" "$swap" "" "$update_res"

  # DELETE -- readonly = fails
  [[ "$test_access" == *"w"* ]] && callApi "Delete entry" "DELETE" "$id" "" "$update_res"

  # CHECK DELETES -- not read/write = skips
  [[ "$test_access" == "rw" ]] && callApi "Check delete [$id]" "GET" "$id" "" "\"error\":"
  [[ "$test_access" == "rw" ]] && callApi "Check delete [$swap]" "GET" "$swap" "" "\"error\":"

  echo "Successfully completed all tests."
  return 0
}


# callApi(description, METHOD, ID Param?, Body?, ResultKey?)
#   $test_res = API Response
callApi() {
  local desc="$1"   # Description of test
  local req="$2"    # GET/POST/PUT/DELETE/etc
  local id="$3"     # URL ID param (if needed)
  local body="$4"   # JSON data to send
  local res="$5"    # RES should include (Otherwise fails if RES is blank or includes ERROR)

  local insecure=""
  [[ $test_SSL = 0 ]] && insecure="-k "
  [ -z "${id}" ] && id=""
  [ -z "${body}" ] && body="{}"

  echo "$desc..."
  test_res=$(curl $insecure-d "$body" -H "Content-Type: application/json" -H "$test_token" -X "$req" "$test_url/$id")

  local fail=false
  [[ -z "${test_res}" ]] && fail=true # result is not empty
  [[ ! -z "${res}" ]] && [[ "$test_res" != *"$res"* ]] && fail=true # result contains '$res'
  [[ -z "${res}" ]] && [[ "$test_res" == *"\"error\":"* ]] && fail=true # result is not an error
  if $fail; then 
    echo -n "FAILED: $test_res "
    [[ ! -z "${res}" ]] && echo "(does not contain '$res')" || echo "(contains '\"error\":' or is empty)"
    echo
    echo "Exiting early due to failed test: $2 ${test_url}/${id} $4"
    exit -1
  fi
  echo "SUCCESS: $test_res"
  echo
}



# getUrl(): Build parameters (Ask user if they're missing)
getUrl() {

  if [[ -z "${test_protocol}" ]]; then
    echo -n "Enter test protocol [default: http]: "
    read test_protocol
  fi
  [[ -z "${test_protocol}" ]] && test_protocol="http"
  if [[ -z "${test_domain}" ]]; then
    echo -n "Enter test domain/IP [default: localhost] $test_protocol://"
    read test_domain
  fi
  [[ -z "${test_domain}" ]] && test_domain="localhost"
  if [[ -z "${test_port}" ]]; then
    echo -n "Enter test port $test_protocol://$test_domain:"
    read test_port
  fi
  [[ ! -z "${test_port}" ]] && test_domain="$test_domain:$test_port"
  if [[ -z "${test_path}" ]]; then
    echo -n "Enter test path $test_protocol://$test_domain/"
    read test_path
  fi
  if [[ -z "${test_token}" ]]; then
    echo -n "Enter authentication token: "
    read test_token
  fi
  if [[ -z "${test_access}" ]]; then
    echo -n "Enter access type (r/w/rw) [default: rw]: "
    read test_access
  fi
  [[ -z "${test_access}" ]] && test_access="rw"
  if [[ -z "${test_key}" ]]; then
    echo -n "Enter name of key to set (Should accept INT [1-100] or STRING): "
    read test_key
  fi
  echo

  if [[ -z "${test_key}" ]] && [[ "$test_access" == *"w"* ]]; then 
    echo "Must provide test key to test write access"
    exit -1
  fi

  [[ ! -z "${test_token}" ]] && test_token="Authorization: Bearer ${test_token}" || test_token="Authorization: None"
  test_url="$test_protocol://$test_domain/$test_path"

  echo "Testing URL: $test_url { $test_key: '<number>' } $test_token [$test_access]"
  read -n 1 -s -r -p "Ensure server is running, then press any key to run tests." usr_key; echo
  echo
}


# getVal(JSON Object, Key): Value
getVal() {
  echo $1 | sed 's/.*"'"$2"'":"*\([^,}"]*\)[,}"].*/\1/'
}


getUrl
runTests