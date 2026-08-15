const { ping } = require("../src/ping");
test("pings", () => expect(ping()).toBe("pong"));
