'use strict';
// Draft, entry-level assessment rubrics. These are GapWise definitions, not ESCO
// equivalences or empirically validated hiring standards. One competency = one unit.
const VERSION = 'role-rubric-v2.0';
const C = {
 programming: ['Programming and implementation', /\b(?:built|implemented|developed|wrote|programmed|coded)\b/i, /\b(?:python|java|javascript|typescript|c\+\+|c#|golang|go language|rust|ruby|php|kotlin|swift|scala|c language|matlab)\b|\b(?:C\+\+|C#)(?!\w)/i, ['C','C++','Java','Python','JavaScript','TypeScript','C#','Go','Rust','Ruby','PHP','Kotlin','Swift','Scala','R','MATLAB'], 'Implement and test a small working feature in one language; link the code.'],
 algorithms: ['Data structures and algorithms', /\b(?:implemented|optimized|solved|designed|analy[sz]ed)\b/i, /\b(?:algorithms?|data structures?|dynamic programming|graph traversal|binary search|time complexity|algorithmic problems?)\b/i, ['Data Structures and Algorithms','DSA'], 'Implement an algorithm, explain its complexity and test edge cases.'],
 application: ['Software implementation', /\b(?:built|developed|implemented|created|maintained)\b/i, /\b(?:applications?|platforms?|services?|software|tools?|apis?|systems?)\b/i, [], 'Build a small usable application and document your contribution and outcome.'],
 debugging: ['Debugging and defect resolution', /\b(?:debugged|diagnosed|fixed|resolved|troubleshot)\b/i, /\b(?:bugs?|defects?|errors?|deadlocks?|race conditions?|failures?)\b/i, [], 'Reproduce a defect, identify the root cause, fix it and add a regression test.'],
 testing: ['Software testing', /\b(?:wrote|implemented|created|ran|automated|executed|built|developed)\b/i, /\b(?:unit tests?|integration tests?|regression tests?|test suites?|testing frameworks?|load tests?|end-to-end tests?)\b/i, ['JUnit','Jest','pytest','Cypress','Playwright'], 'Add automated tests for expected behavior, edge cases and failure paths.'],
 design: ['Modular software design', /\b(?:designed|implemented|refactored|created|applied|used)\b/i, /\b(?:design patterns?|strategy pattern|factory pattern|observer pattern|adapter pattern|singleton pattern|modular (?:services?|architecture|components?)|reusable components?|separation of concerns)\b/i, ['Object-Oriented Programming','OOP'], 'Refactor a feature into well-defined modules and explain the design trade-offs.'],
 version: ['Version control and collaboration', /\b(?:used|managed|merged|reviewed|created|configured|committed|rebased)\b/i, /\b(?:git|pull requests?|branches|version control|commits?)\b/i, ['Git','GitHub','GitLab'], 'Use branches and meaningful commits; document a pull request or review.'],
 requirements: ['Requirements analysis', /\b(?:analy[sz]ed|defined|translated|elicited|documented|reviewed)\b/i, /\b(?:requirements?|acceptance criteria|software specifications?|user stories)\b/i, [], 'Translate a feature request into acceptance criteria and verification tests.'],
 api: ['API development and integration', /\b(?:built|developed|implemented|integrated|designed|maintained|consumed)\b/i, /\b(?:rest(?:ful)?\s+apis?|graphql|grpc|api endpoints?|apis?|web services?)\b/i, ['REST API','REST APIs','GraphQL','gRPC'], 'Build or consume an API with validation, error handling and documented requests.'],
 database: ['Database implementation', /\b(?:designed|implemented|queried|integrated|optimized|provisioned|configured|migrated|built)\b/i, /\b(?:databases?|sql|postgresql|mysql|mongodb|sqlite|redis|schemas?|orm)\b/i, ['SQL','MySQL','PostgreSQL','MongoDB','SQLite','Redis'], 'Design a data model, implement queries and test constraints or failure cases.'],
 deployment: ['Deployment and delivery', /\b(?:deployed|containerized|containerised|configured|automated|provisioned|released)\b/i, /\b(?:docker|kubernetes|cloud|ci\/cd|pipelines?|vercel|aws|azure|gcp|applications?|apis?|services?)\b/i, ['Docker','Kubernetes','AWS','Azure','Microsoft Azure','GCP','Google Cloud','Vercel','Render'], 'Deploy a reproducible application and document configuration and rollback steps.'],
 security: ['Application security fundamentals', /\b(?:implemented|configured|enforced|validated|secured|mitigated)\b/i, /\b(?:authentication|authorization|authorisation|input validation|access control|encryption|csrf|xss|sql injection)\b/i, [], 'Implement access control and validation, then test unauthorized and malformed requests.'],
 ui: ['User interface implementation', /\b(?:built|developed|implemented|created|designed)\b/i, /\b(?:user interfaces?|ui components?|react components?|vue components?|angular components?|web pages?|frontends?|responsive layouts?)\b/i, ['React','Vue','Angular','HTML','CSS','HTML/CSS','Svelte'], 'Build a responsive interface and document component structure and interactions.'],
 accessibility: ['Accessibility and responsive design', /\b(?:implemented|tested|audited|improved|built)\b/i, /\b(?:accessibility|wcag|keyboard navigation|screen readers?|responsive (?:design|layouts?))\b/i, [], 'Test keyboard navigation, semantic markup and layouts at different screen widths.'],
 state: ['Client-side state and data handling', /\b(?:implemented|managed|integrated|built|configured)\b/i, /\b(?:state management|redux|zustand|context api|client-side caching|loading states?|data fetching)\b/i, ['Redux','Zustand'], 'Implement state and asynchronous data loading with error and loading states.'],
 statistics: ['Statistical analysis', /\b(?:performed|applied|computed|analy[sz]ed|estimated|conducted)\b/i, /\b(?:hypothesis tests?|confidence intervals?|regression analysis|statistical analysis|correlation|distributions?)\b/i, ['Statistics','Probability'], 'Analyze a dataset with an appropriate statistical method and explain uncertainty.'],
 preparation: ['Data preparation', /\b(?:cleaned|processed|transformed|preprocessed|imputed|normalized|normalised|engineered)\b/i, /\b(?:data|datasets?|features?|missing values?|outliers?)\b/i, ['Pandas','NumPy'], 'Clean a dataset and document transformations, missing values and leakage controls.'],
 modeling: ['Model training and selection', /\b(?:trained|fine-tuned|fitted|compared)\b/i, /\b(?:machine learning models?|ml models?|predictive models?|classifiers?|regressors?|neural networks?|random forests?|transformers?|models?)\b/i, ['scikit-learn','PyTorch','TensorFlow'], 'Train a baseline and alternative model using a reproducible split.'],
 evaluation: ['Model evaluation', /\b(?:evaluated|validated|measured|compared|benchmarked)\b/i, /\b(?:precision|recall|f1|roc[- ]auc|rmse|mae|cross-validation|test accuracy|model performance)\b/i, [], 'Evaluate on held-out data using relevant metrics and discuss failure cases.'],
 visualization: ['Data visualization and communication', /\b(?:created|visualized|visualised|presented|built|developed)\b/i, /\b(?:dashboards?|charts?|plots?|visualizations?|visualisations?)\b/i, ['Tableau','Power BI','Matplotlib','Seaborn'], 'Create a clear visualization and explain the decision it supports.'],
 mlops: ['Model serving and monitoring', /\b(?:deployed|served|monitored|implemented|automated|configured)\b/i, /\b(?:model serving|model endpoints?|model monitoring|inference pipelines?|model drift|ml pipelines?)\b/i, ['MLflow','Kubeflow'], 'Serve a trained model and add a reproducible inference test and monitoring signal.']
};
const PROFILES = {
 'role:software-engineer': {required:['programming','algorithms','application','debugging','testing','design','version'],preferred:['requirements','api','database','deployment','security']},
 'role:backend-developer': {required:['programming','application','api','database','testing','debugging','version','security'],preferred:['design','deployment','requirements']},
 'role:frontend-developer': {required:['programming','ui','state','api','accessibility','testing','debugging','version'],preferred:['design','deployment','requirements']},
 'role:full-stack-developer': {required:['programming','ui','state','api','database','testing','debugging','version'],preferred:['accessibility','design','deployment','security','requirements']},
 'role:data-scientist': {required:['programming','statistics','preparation','modeling','evaluation','visualization'],preferred:['database','version','requirements']},
 'role:ml-engineer': {required:['programming','preparation','modeling','evaluation','mlops','testing','version'],preferred:['deployment','api','database','statistics','security']}
};
function getRequirements(roleId) {
 const p = Object.hasOwn(PROFILES,roleId) ? PROFILES[roleId] : null;
 if (!p) throw new Error(`Role not found: ${roleId}`);
 return ['required','preferred'].flatMap(type=>p[type].map(key=>({id:`gapwise:competency:${key}`,canonicalName:C[key][0],requirementType:type,key})));
}
function buildRubricAssessment(roleId,catalog){
 if(catalog?.role?.id!==roleId) throw new Error('Role catalog mismatch');
 const requirements=getRequirements(roleId);
 const essential=requirements.filter(r=>r.requirementType==='required');
 const optional=requirements.filter(r=>r.requirementType==='preferred');
 return {success:true,role:catalog.role,skills:{essential,optional},statistics:{essential:essential.length,optional:optional.length,total:requirements.length},assessment:{id:roleId,version:VERSION,type:'gapwise-role-rubric',scope:'Entry-level resume evidence coverage; not verified ability or hiring probability',validationStatus:'draft-not-externally-validated',referenceCatalogStatistics:catalog.statistics}};
}
module.exports={VERSION,C,PROFILES,getRequirements,buildRubricAssessment};
