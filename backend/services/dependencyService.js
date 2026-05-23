export const analyzeDependencies = (
  repository
) => {

  const files =
    repository.files || [];

  const issues = [];
  const recommendations = [];

  // FIND package.json

  const packageFile =
    files.find(file =>
      file.path.includes('package.json')
    );

  if (!packageFile) {

    return {
      issues: [
        'No package.json found'
      ],
      recommendations: []
    };
  }

  let packageData = {};

  try {

    packageData = JSON.parse(
      packageFile.content || '{}'
    );

  } catch {

    return {
      issues: [
        'Invalid package.json'
      ],
      recommendations: []
    };
  }

  const dependencies = {

    ...(packageData.dependencies || {}),
    ...(packageData.devDependencies || {})
  };

  const dependencyNames =
    Object.keys(dependencies);

  // HEAVY LIBRARIES

  const heavyLibraries = [
    'moment',
    'lodash',
    'bootstrap',
    'jquery'
  ];

  dependencyNames.forEach(dep => {

    if (
      heavyLibraries.includes(dep)
    ) {

      issues.push(
        `Heavy dependency detected: ${dep}`
      );

      recommendations.push(
        `Consider lighter alternative for ${dep}`
      );
    }

  });

  // UNUSED DEPENDENCY CHECK

  dependencyNames.forEach(dep => {

    let used = false;

    files.forEach(file => {

      const content =
        file.content || '';

      if (
        content.includes(dep)
      ) {
        used = true;
      }

    });

    if (!used) {

      issues.push(
        `Possibly unused dependency: ${dep}`
      );

    }

  });

  return {

    totalDependencies:
      dependencyNames.length,

    issues,

    recommendations
  };
};