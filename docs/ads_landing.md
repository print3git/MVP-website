# Advertising Landing Links

The landing page script (`js/subredditLanding.js`) loads a 3D model and tagline based on the subreddit parameter in the page URL.

To ensure visitors see the correct creative, include an `sr` parameter in every advertisement's link. For example:

```
https://print3.example.com/index.html?sr=art
```

The page requests data for that subreddit from the API endpoint
`/api/subreddit/<name>`, so new subreddits can be added without modifying the
client script.
