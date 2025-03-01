pipeline {
    agent any

    environment {
        DOCKER_HUB_CREDENTIALS = credentials('docker-hub-credentials') // Sesuaikan dengan ID credentials Docker Hub di Jenkins
        DOCKER_IMAGE_NAME = 'nestorzamili/blastify' // Ganti dengan nama image Docker Anda
    }

    stages {
        stage('Select Branch') {
            steps {
                script {
                    // Ambil list branch dari GitHub
                    def branches = sh(script: "git ls-remote --heads https://github.com/nestorzamili/blastify.git | awk '{print \$2}' | sed 's/refs\\/heads\\///'", returnStdout: true).trim().split('\n')
                    
                    // Tampilkan pilihan branch
                    BRANCH_NAME = input(
                        id: 'branch', message: 'Pilih branch', parameters: [
                            choice(name: 'BRANCH_NAME', choices: branches, description: 'Pilih branch yang akan di-build')
                        ]
                    )
                    
                    // Checkout branch yang dipilih
                    checkout([$class: 'GitSCM', branches: [[name: BRANCH_NAME]], userRemoteConfigs: [[url: 'https://github.com/nestorzamili/blastify.git']]])
                }
            }
        }

        stage('Select Version') {
            steps {
                script {
                    // Ambil list tag dari GitHub
                    def tags = sh(script: "git ls-remote --tags https://github.com/nestorzamili/blastify.git | awk '{print \$2}' | sed 's/refs\\/tags\\///' | sed 's/\\^{}//'", returnStdout: true).trim().split('\n')
                    
                    // Tampilkan pilihan tag
                    TAG_NAME = input(
                        id: 'tag', message: 'Pilih version', parameters: [
                            choice(name: 'TAG_NAME', choices: tags, description: 'Pilih version yang akan di-build')
                        ]
                    )
                    
                    // Checkout tag yang dipilih
                    checkout([$class: 'GitSCM', branches: [[name: TAG_NAME]], userRemoteConfigs: [[url: 'https://github.com/nestorzamili/blastify.git']]])
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    // Build Docker image
                    docker.build("${env.DOCKER_IMAGE_NAME}:${TAG_NAME}")
                }
            }
        }

        stage('Push Docker Image') {
            steps {
                script {
                    // Login ke Docker Hub
                    docker.withRegistry('https://registry.hub.docker.com', env.DOCKER_HUB_CREDENTIALS) {
                        // Push Docker image
                        docker.image("${env.DOCKER_IMAGE_NAME}:${TAG_NAME}").push()
                    }
                }
            }
        }
    }

    post {
        success {
            echo "Build dan push image Docker berhasil!"
        }
        failure {
            echo "Build dan push image Docker gagal."
        }
    }
}