pipeline {
    agent any
    
    parameters {
        gitParameter name: 'BRANCH', 
                    type: 'PT_BRANCH',
                    defaultValue: 'main',
                    description: 'Select the branch to build'
                    
        string(name: 'TAG', 
               defaultValue: '', 
               description: 'Tag version (leave empty to use latest git tag)')
    }
    
    environment {
        DOCKER_HUB_CREDS = credentials('docker-hub-credentials')
        DOCKER_IMAGE = "blastify"
        DOCKER_USERNAME = "${DOCKER_HUB_CREDS_USR}"
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: "${params.BRANCH}"]],
                    doGenerateSubmoduleConfigurations: false,
                    extensions: [[$class: 'CleanBeforeCheckout']],
                    userRemoteConfigs: [[
                        credentialsId: 'git-credentials', 
                        url: 'https://github.com/nestorzamili/blastify.git'
                    ]]
                ])
            }
        }
        
        stage('Determine Tag') {
            steps {
                script {
                    if (params.TAG.trim()) {
                        // Use provided tag
                        env.BUILD_TAG = params.TAG.trim()
                    } else {
                        // Get latest git tag, or use default
                        try {
                            env.BUILD_TAG = sh(script: 'git describe --tags --abbrev=0', returnStdout: true).trim()
                        } catch (Exception e) {
                            echo "No git tags found, using default version"
                            env.BUILD_TAG = '0.0.1'
                        }
                    }
                    echo "Building with tag: ${env.BUILD_TAG}"
                }
            }
        }
        
        stage('Docker Login') {
            steps {
                sh 'echo $DOCKER_HUB_CREDS_PSW | docker login -u $DOCKER_HUB_CREDS_USR --password-stdin'
            }
        }
        
        stage('Build and Push') {
            steps {
                sh """
                docker build -t ${DOCKER_USERNAME}/${DOCKER_IMAGE}:${env.BUILD_TAG} \
                    --build-arg GIT_TAG=${env.BUILD_TAG} \
                    .
                docker push ${DOCKER_USERNAME}/${DOCKER_IMAGE}:${env.BUILD_TAG}
                """
            }
        }
    }
    
    post {
        always {
            sh 'docker logout'
            cleanWs()
        }
    }
}
