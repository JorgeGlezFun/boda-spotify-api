export default async function handler(req, res) {
    try {
        const query = req.query.q?.trim();

        if (!query) {
            return res.status(400).json({
                error: "Falta el parámetro q.",
            });
        }

        const clientId = process.env.SPOTIFY_CLIENT_ID;
        const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return res.status(500).json({
                error: "Faltan las credenciales de Spotify.",
            });
        }

        const credentials = Buffer.from(
            `${clientId}:${clientSecret}`
        ).toString("base64");

        const tokenResponse = await fetch(
            "https://accounts.spotify.com/api/token",
            {
                method: "POST",
                headers: {
                    Authorization: `Basic ${credentials}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: "grant_type=client_credentials",
            }
        );

        if (!tokenResponse.ok) {
            console.error(await tokenResponse.text());

            return res.status(500).json({
                error: "No se pudo autenticar con Spotify.",
            });
        }

        const tokenData = await tokenResponse.json();

        const params = new URLSearchParams({
            q: query,
            type: "track",
            market: "ES",
            limit: "10",
        });

        const searchResponse = await fetch(
            `https://api.spotify.com/v1/search?${params}`,
            {
                headers: {
                    Authorization: `Bearer ${tokenData.access_token}`,
                },
            }
        );

        if (!searchResponse.ok) {
            console.error(await searchResponse.text());

            return res.status(searchResponse.status).json({
                error: "No se pudieron buscar las canciones.",
            });
        }

        const data = await searchResponse.json();

        const tracks = (data.tracks?.items || []).map((track) => ({
            id: track.id,
            name: track.name,
            artists: track.artists?.map((artist) => ({
                name: artist.name,
            })) || [],
            album: {
                images: track.album?.images || [],
            },
            external_urls: {
                spotify: track.external_urls?.spotify || "",
            },
        }));

        return res.status(200).json({
            tracks: {
                items: tracks,
            },
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Error interno.",
        });
    }
}