export async function onRequestGet({ request, env }) {
    try {
        const auth = request.headers.get("Authorization");
        if (!auth) return new Response("No autorizado", { status: 401 });

        const url = new URL(request.url);
        const draw = (url.searchParams.get("draw") || "NOCTURNA").toUpperCase();

        const pageUrl = "https://www.loteriasmundiales.com.ar/Quinielas/mendoza";

        const response = await fetch(pageUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "es-AR,es;q=0.9,en;q=0.8"
            }
        });

        if (!response.ok) {
            return new Response(JSON.stringify({ error: `Error al obtener la página: ${response.statusText}` }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        const htmlText = await response.text();

        // Split by "Quiniela de Mendoza" to find all draw blocks
        const mendozaBlocks = htmlText.split(/Quiniela de Mendoza/i);
        let targetBlock = null;

        for (let i = 1; i < mendozaBlocks.length; i++) {
            const block = mendozaBlocks[i];
            if (block.toUpperCase().includes(draw)) {
                targetBlock = block;
                break;
            }
        }

        if (!targetBlock) {
            return new Response(JSON.stringify({ error: `No se encontraron resultados para el sorteo "${draw}" de Mendoza. Es posible que aún no se haya realizado el sorteo de hoy.` }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Truncate the block at the next "Quiniela" heading to avoid grabbing numbers from another draw
        const nextQuinielaIdx = targetBlock.search(/Quiniela de/i);
        if (nextQuinielaIdx > 0) {
            targetBlock = targetBlock.substring(0, nextQuinielaIdx);
        }

        const numbers = new Array(20).fill("");

        // Method 1: Extract from <tr>...</tr> rows containing <td> with 4-digit numbers
        const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let match;
        let rowCount = 0;

        while ((match = trRegex.exec(targetBlock)) !== null && rowCount < 10) {
            const trContent = match[1];
            // Match 4-digit numbers inside td tags
            const tdRegex = /<td[^>]*>\s*(\d{4})\s*<\/td>/gi;
            let tdMatch;
            const rowNums = [];
            while ((tdMatch = tdRegex.exec(trContent)) !== null) {
                rowNums.push(tdMatch[1]);
            }

            if (rowNums.length >= 2) {
                // Row has position N (col1) and position N+10 (col2)
                numbers[rowCount] = rowNums[0];
                numbers[rowCount + 10] = rowNums[1];
                rowCount++;
            }
        }

        // Method 2 (fallback): If TR/TD parsing didn't work, extract all 4-digit numbers sequentially
        if (rowCount < 10) {
            const allFourDigits = [...targetBlock.matchAll(/\b\d{4}\b/g)].map(m => m[0]);
            if (allFourDigits.length >= 20) {
                for (let i = 0; i < 10; i++) {
                    numbers[i] = allFourDigits[i * 2];
                    numbers[i + 10] = allFourDigits[i * 2 + 1];
                }
                rowCount = 10;
            }
        }

        if (rowCount < 10) {
            return new Response(JSON.stringify({ 
                error: "No se pudieron extraer los 20 números del sorteo. Es posible que el sorteo aún no se haya realizado.",
                partial: numbers.filter(n => n !== "")
            }), {
                status: 422,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Detect day of week from the page
        let diaSemana = "";
        const diasMap = {
            "lunes": "Lunes", "martes": "Martes", "miércoles": "Miércoles", "miercoles": "Miércoles",
            "jueves": "Jueves", "viernes": "Viernes", "sábado": "Sábado", "sabado": "Sábado",
            "domingo": "Domingo"
        };

        // Try to find day from the page date header (e.g., "Sábado 17 de Mayo de 2025")
        const dateHeaderMatch = htmlText.match(/(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\s+\d{1,2}\s+de\s+\w+/i);
        if (dateHeaderMatch) {
            const dayFound = dateHeaderMatch[1].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            for (const [key, value] of Object.entries(diasMap)) {
                if (key.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === dayFound) {
                    diaSemana = value;
                    break;
                }
            }
        }

        // If we couldn't detect day from page, use server date (Argentina timezone)
        if (!diaSemana) {
            const now = new Date();
            // Argentina is UTC-3
            const argDate = new Date(now.getTime() - (3 * 60 * 60 * 1000));
            const dayIndex = argDate.getUTCDay();
            const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
            diaSemana = dias[dayIndex];
        }

        return new Response(JSON.stringify({ 
            success: true, 
            draw, 
            numbers,
            dia_semana: diaSemana
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
