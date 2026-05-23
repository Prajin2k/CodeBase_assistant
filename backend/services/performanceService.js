export const analyzePerformance = (
  repository
) => {

  const files =
    repository.files || [];

  const issues = [];
  const optimizations = [];

  files.forEach(file => {

    const content =
      file.content || '';

    const path =
      file.path || '';

    // LARGE COMPONENTS

    const lines =
      content.split('\n').length;

    if (lines > 500) {

      issues.push(
        `Large file may impact maintainability: ${file.name}`
      );

      optimizations.push(
        `Split ${file.name} into smaller reusable modules`
      );
    }

    // REACT PERFORMANCE

    if (
      path.includes('.jsx') ||
      path.includes('.js')
    ) {

      if (
        content.includes('useEffect') &&
        !content.includes('useCallback')
      ) {

        optimizations.push(
          `Consider useCallback/useMemo optimization in ${file.name}`
        );
      }

      if (
        content.includes('map(') &&
        !content.includes('key=')
      ) {

        issues.push(
          `Missing React keys detected in ${file.name}`
        );
      }

      if (
        content.includes('console.log')
      ) {

        issues.push(
          `Remove console.log statements from ${file.name}`
        );
      }

    }

    // API OPTIMIZATION

    if (
      path.includes('route') ||
      path.includes('controller')
    ) {

      if (
        !content.includes('try')
      ) {

        issues.push(
          `Missing error handling in ${file.name}`
        );
      }

      if (
        content.includes('find(') &&
        !content.includes('limit(')
      ) {

        optimizations.push(
          `Consider query pagination in ${file.name}`
        );
      }

    }

  });

  return {
    issues,
    optimizations
  };
};