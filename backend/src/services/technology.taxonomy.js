const technologyTaxonomy = [
    // --------------------------------------------------
    // Programming Languages
    // --------------------------------------------------

    {
        id: "tech:javascript",
        canonicalName: "JavaScript",
        category: "programming-language",
        aliases: [
            "javascript",
            "js"
        ]
    },

    {
        id: "tech:typescript",
        canonicalName: "TypeScript",
        category: "programming-language",
        aliases: [
            "typescript",
            "ts"
        ]
    },

    {
        id: "tech:python",
        canonicalName: "Python",
        category: "programming-language",
        aliases: [
            "python"
        ]
    },

    {
        id: "tech:java",
        canonicalName: "Java",
        category: "programming-language",
        aliases: [
            "java"
        ]
    },

    {
        id: "tech:cpp",
        canonicalName: "C++",
        category: "programming-language",
        aliases: [
            "c++",
            "cpp"
        ]
    },


    // --------------------------------------------------
    // Web Technologies
    // --------------------------------------------------

    {
        id: "tech:html",
        canonicalName: "HTML",
        category: "web-technology",
        aliases: [
            "html",
            "html5"
        ]
    },

    {
        id: "tech:css",
        canonicalName: "CSS",
        category: "web-technology",
        aliases: [
            "css",
            "css3"
        ]
    },


    // --------------------------------------------------
    // Frameworks / Libraries / Runtime
    // --------------------------------------------------

    {
        id: "tech:react",
        canonicalName: "React",
        category: "framework-library",
        aliases: [
            "react",
            "react.js",
            "reactjs"
        ]
    },

    {
        id: "tech:nodejs",
        canonicalName: "Node.js",
        category: "runtime",
        aliases: [
            "node.js",
            "nodejs",
            "node"
        ]
    },

    {
        id: "tech:express",
        canonicalName: "Express.js",
        category: "framework",
        aliases: [
            "express.js",
            "expressjs",
            "express"
        ]
    },


    // --------------------------------------------------
    // Databases
    // --------------------------------------------------

    {
        id: "tech:mongodb",
        canonicalName: "MongoDB",
        category: "database",
        aliases: [
            "mongodb",
            "mongo db"
        ]
    },

    {
        id: "tech:postgresql",
        canonicalName: "PostgreSQL",
        category: "database",
        aliases: [
            "postgresql",
            "postgres"
        ]
    },

    {
        id: "tech:sql",
        canonicalName: "SQL",
        category: "database",
        aliases: [
            "sql",
            "structured query language"
        ]
    },

    {
        id: "tech:mysql",
        canonicalName: "MySQL",
        category: "database",
        aliases: [
            "mysql"
        ]
    },

    {
        id: "tech:redis",
        canonicalName: "Redis",
        category: "database",
        aliases: [
            "redis"
        ]
    },


    // --------------------------------------------------
    // DevOps / Infrastructure
    // --------------------------------------------------

    {
        id: "tech:docker",
        canonicalName: "Docker",
        category: "devops",
        aliases: [
            "docker"
        ]
    },

    {
        id: "tech:kubernetes",
        canonicalName: "Kubernetes",
        category: "devops",
        aliases: [
            "kubernetes",
            "k8s"
        ]
    },


    // --------------------------------------------------
    // Developer Tools / Platforms
    // --------------------------------------------------

    {
        id: "tech:git",
        canonicalName: "Git",
        category: "developer-tool",
        aliases: [
            "git"
        ]
    },

    {
        id: "tech:github",
        canonicalName: "GitHub",
        category: "developer-platform",
        aliases: [
            "github"
        ]
    },

    {
        id: "tech:prisma",
        canonicalName: "Prisma",
        category: "orm",
        aliases: [
            "prisma",
            "prisma orm"
        ]
    },


    // --------------------------------------------------
    // APIs
    // --------------------------------------------------

    {
        id: "tech:rest-api",
        canonicalName: "REST API",
        category: "api",
        aliases: [
            "rest api",
            "restful api",
            "restful apis",
            "rest apis"
        ]
    },

    {
        id: "tech:graphql",
        canonicalName: "GraphQL",
        category: "api",
        aliases: [
            "graphql"
        ]
    },


    // --------------------------------------------------
    // Cloud Platforms
    // --------------------------------------------------

    {
        id: "tech:aws",
        canonicalName: "AWS",
        category: "cloud-platform",
        aliases: [
            "aws",
            "amazon web services"
        ]
    },

    {
        id: "tech:azure",
        canonicalName: "Microsoft Azure",
        category: "cloud-platform",
        aliases: [
            "azure",
            "microsoft azure"
        ]
    },

    {
        id: "tech:gcp",
        canonicalName: "Google Cloud",
        category: "cloud-platform",
        aliases: [
            "gcp",
            "google cloud",
            "google cloud platform"
        ]
    },


    // --------------------------------------------------
    // Deployment Platforms
    // --------------------------------------------------

    {
        id: "tech:vercel",
        canonicalName: "Vercel",
        category: "deployment-platform",
        aliases: [
            "vercel"
        ]
    },

    {
        id: "tech:render",
        canonicalName: "Render",
        category: "deployment-platform",
        aliases: [
            "render"
        ]
    },

    // Fix 08C: expanded framework, data, ML, visualization and testing coverage
    {
        "id": "tech:vue",
        "canonicalName": "Vue",
        "category": "framework-library",
        "aliases": [
            "vue",
            "vue.js",
            "vuejs"
        ]
    },
    {
        "id": "tech:angular",
        "canonicalName": "Angular",
        "category": "framework",
        "aliases": [
            "angular"
        ]
    },
    {
        "id": "tech:svelte",
        "canonicalName": "Svelte",
        "category": "framework-library",
        "aliases": [
            "svelte"
        ]
    },
    {
        "id": "tech:next-js",
        "canonicalName": "Next.js",
        "category": "framework",
        "aliases": [
            "next.js",
            "nextjs"
        ]
    },
    {
        "id": "tech:spring-boot",
        "canonicalName": "Spring Boot",
        "category": "framework",
        "aliases": [
            "spring boot",
            "springboot"
        ]
    },
    {
        "id": "tech:django",
        "canonicalName": "Django",
        "category": "framework",
        "aliases": [
            "django"
        ]
    },
    {
        "id": "tech:fastapi",
        "canonicalName": "FastAPI",
        "category": "framework",
        "aliases": [
            "fastapi",
            "fast api"
        ]
    },
    {
        "id": "tech:flask",
        "canonicalName": "Flask",
        "category": "framework",
        "aliases": [
            "flask"
        ]
    },
    {
        "id": "tech:pandas",
        "canonicalName": "Pandas",
        "category": "data-library",
        "aliases": [
            "pandas"
        ]
    },
    {
        "id": "tech:numpy",
        "canonicalName": "NumPy",
        "category": "data-library",
        "aliases": [
            "numpy"
        ]
    },
    {
        "id": "tech:scikit-learn",
        "canonicalName": "scikit-learn",
        "category": "ml-framework",
        "aliases": [
            "scikit-learn",
            "sklearn"
        ]
    },
    {
        "id": "tech:pytorch",
        "canonicalName": "PyTorch",
        "category": "ml-framework",
        "aliases": [
            "pytorch"
        ]
    },
    {
        "id": "tech:tensorflow",
        "canonicalName": "TensorFlow",
        "category": "ml-framework",
        "aliases": [
            "tensorflow"
        ]
    },
    {
        "id": "tech:matplotlib",
        "canonicalName": "Matplotlib",
        "category": "visualization-library",
        "aliases": [
            "matplotlib"
        ]
    },
    {
        "id": "tech:seaborn",
        "canonicalName": "Seaborn",
        "category": "visualization-library",
        "aliases": [
            "seaborn"
        ]
    },
    {
        "id": "tech:plotly",
        "canonicalName": "Plotly",
        "category": "visualization-library",
        "aliases": [
            "plotly"
        ]
    },
    {
        "id": "tech:jest",
        "canonicalName": "Jest",
        "category": "testing-framework",
        "aliases": [
            "jest"
        ]
    },
    {
        "id": "tech:pytest",
        "canonicalName": "pytest",
        "category": "testing-framework",
        "aliases": [
            "pytest"
        ]
    },
    {
        "id": "tech:cypress",
        "canonicalName": "Cypress",
        "category": "testing-framework",
        "aliases": [
            "cypress"
        ]
    },
    {
        "id": "tech:playwright",
        "canonicalName": "Playwright",
        "category": "testing-framework",
        "aliases": [
            "playwright"
        ]
    }
];

module.exports = technologyTaxonomy;