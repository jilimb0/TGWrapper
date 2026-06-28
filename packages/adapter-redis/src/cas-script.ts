export const CAS_SCRIPT = `
local key = KEYS[1]
local expected = tonumber(ARGV[1])
local next_payload = ARGV[2]
local ttl = tonumber(ARGV[3])

local current = redis.call('GET', key)
if not current then
  if expected ~= 0 then
    return {0, ''}
  end
  if ttl > 0 then
    redis.call('SET', key, next_payload, 'EX', ttl)
  else
    redis.call('SET', key, next_payload)
  end
  return {1, ''}
end

local decoded = cjson.decode(current)
if tonumber(decoded.version) ~= expected then
  return {0, current}
end

if ttl > 0 then
  redis.call('SET', key, next_payload, 'EX', ttl)
else
  redis.call('SET', key, next_payload)
end
return {1, ''}
`;
