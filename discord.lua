self = "Bwfa-NTF2oHy9fVbcB5vYgI7h9N9W-FBqkFv1BM5PjM"

DiscordUsers = DiscordUsers or {}

-- Function to check if a user is in the DiscordUsers table
local function isUserRegistered(from)
    for _, value in ipairs(DiscordUsers) do
        if value == from then
            return true
        end
    end
    return false
end

Handlers.add(
    "SignUp",
    Handlers.utils.hasMatchingTag("Action", "SignUpForBobsDiscord"),
    function(msg)
        if not isUserRegistered(msg.From) then
            table.insert(DiscordUsers, msg.From)
            Handlers.utils.reply("You are signed up, you can send messages to Discord now.")
        end
    end
)

Handlers.add(
    "voiceOfDiscord",
    Handlers.utils.hasMatchingTag("Origin", "MyDiscordBot"),
    function(msg)
        local toSend = "Discord user " .. msg.Tags.Author .. " said: " .. msg.Data
        for _, recipient in ipairs(DiscordUsers) do
            Send({ Target = recipient, Data = toSend })
        end
    end
)

Handlers.add(
    "sendToDiscord",
    Handlers.utils.hasMatchingTag("Action", "sendToDiscord"),
    function(msg)
        if isUserRegistered(msg.From) then
            print("sending to discord")
            local json = require("json")
            Send({
                Target = "WSXUI2JjYUldJ7CKq9wE1MGwXs-ldzlUlHOQszwQe0s",
                Action = "Post-Real-Data",
                Url = "https://bobinstein.xyz/discord",
                Body = json.encode({
                    From = msg.From,
                    Data = msg.Data
                })
            })
        else
            print("User is not registered, cannot send to Discord.")
            Handlers.utils.reply("We aren't sendng shit for you. You are not one of us.")
        end
    end
)

Handlers.add(
    "getFromDiscord",
    Handlers.utils.hasMatchingTag("Action", "getFromDiscord"),
    function(msg)
        if isUserRegistered(msg.From) then
            print("Getting From discord")
            Send({
                Target = "WSXUI2JjYUldJ7CKq9wE1MGwXs-ldzlUlHOQszwQe0s",
                Action = "Get-Real-Data",
                Url = "https://bobinstein.xyz/discord",
            })
        else
            print("User is not registered, cannot get data from Discord.")
        end
    end
)
