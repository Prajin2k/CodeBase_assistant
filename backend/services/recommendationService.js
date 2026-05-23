export const recommendFiles = (
  repository,
  query
) => {

  const files =
    repository.files || [];

  const lowerQuery =
    query.toLowerCase();

  const scoredFiles =
    files.map(file => {

      let score = 0;

      const path =
        (file.path || '')
          .toLowerCase();

      const content =
        (file.content || '')
          .toLowerCase();

      // PATH MATCHES

      if (
        lowerQuery.includes('auth')
      ) {

        if (
          path.includes('auth')
        ) {
          score += 20;
        }

      }

      if (
        lowerQuery.includes('database')
      ) {

        if (
          path.includes('model') ||
          path.includes('db')
        ) {
          score += 20;
        }

      }

      // CONTENT MATCHES

      lowerQuery
        .split(' ')
        .forEach(word => {

          if (
            content.includes(word)
          ) {
            score += 2;
          }

          if (
            path.includes(word)
          ) {
            score += 5;
          }

        });

      return {
        file,
        score
      };

    });

  const recommendations =
    scoredFiles
      .sort((a, b) =>
        b.score - a.score
      )
      .slice(0, 5)
      .map(item => ({
        name: item.file.name,
        path: item.file.path,
        language:
          item.file.language
      }));

  return recommendations;
};