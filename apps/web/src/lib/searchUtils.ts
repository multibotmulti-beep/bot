export const searchProducts = (products: any[], query: string) => {
  if (!query) return products;

  const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);
  const technicalKeys = [
    'images',
    'imagen',
    'img',
    'image',
    'is_offer',
    'discount_percent',
    'discountpercent',
  ];

  return [...products]
    .filter((p) => {
      // Unir todos los campos buscables en una sola cadena
      const searchableText = [
        p.name || '',
        p.category || '',
        p.metadata
          ? Object.entries(p.metadata)
              .filter(
                ([key]) => !technicalKeys.includes(key.toLowerCase().trim())
              )
              .map(([_, val]) => String(val))
              .join(' ')
          : '',
      ]
        .join(' ')
        .toLowerCase();

      // Verificar que TODAS las palabras de búsqueda estén presentes
      return queryWords.every((word) => searchableText.includes(word));
    })
    .sort((a, b) => {
      // Lógica de scoring para ordenar resultados
      const getScore = (p: any) => {
        const text = [p.name, p.category].join(' ').toLowerCase();
        let score = 0;

        // Si el nombre completo coincide, puntaje alto
        if (text.includes(query.toLowerCase())) score += 10;

        // Puntos extra si todas las palabras aparecen
        queryWords.forEach((word) => {
          if (text.includes(word)) score += 2;
          if (
            p.metadata &&
            Object.values(p.metadata).some((val) =>
              String(val).toLowerCase().includes(word)
            )
          )
            score += 1;
        });

        return score;
      };
      return getScore(b) - getScore(a);
    });
};

export const getPrediction = (products: any[], query: string) => {
  if (!query) return '';
  const q = query.toLowerCase();
  // Buscar coincidencia empezando por la palabra completa actual
  const match = products.find((p) => p.name?.toLowerCase().startsWith(q));
  return match ? match.name : '';
};
