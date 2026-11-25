pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timestamps()
    }

    triggers {
        pollSCM('H/5 * * * *')
    }

    environment {
        COMPOSE_FILE = 'OneDrive/Documentos/bugfly/docker-compose.yml'
    }

    stages {
        stage('Obtener codigo de GitHub') {
            steps {
                checkout scm
            }
        }

        stage('Verificar frontend Next.js') {
            steps {
                script {
                    if (!fileExists('frontend/package-lock.json')) {
                        error('Falta frontend/ en esta rama. Integrar primero la rama frontend/bugfly.')
                    }
                    if (isUnix()) {
                        sh 'cd frontend && node --version && npm --version && npm ci && npm run build'
                    } else {
                        bat 'cd frontend && node --version && call npm --version && call npm ci && call npm run build'
                    }
                }
            }
        }

        stage('Verificar Docker') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'docker version && docker compose version'
                    } else {
                        bat 'docker version && docker compose version'
                    }
                }
            }
        }

        stage('Construir imagen FastAPI') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'docker compose -f "$COMPOSE_FILE" build web'
                    } else {
                        bat 'docker compose -f "%COMPOSE_FILE%" build web'
                    }
                }
            }
        }

        stage('Iniciar PostgreSQL y FastAPI') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'docker compose -f "$COMPOSE_FILE" up -d db web'
                    } else {
                        bat 'docker compose -f "%COMPOSE_FILE%" up -d db web'
                    }
                }
            }
        }

        stage('Verificar disponibilidad') {
            steps {
                retry(12) {
                    sleep time: 5, unit: 'SECONDS'
                    script {
                        if (isUnix()) {
                            sh 'docker compose -f "$COMPOSE_FILE" exec -T web python -c "import urllib.request; urllib.request.urlopen(\'http://127.0.0.1:8000/health\',timeout=3)"'
                        } else {
                            bat 'docker compose -f "%COMPOSE_FILE%" exec -T web python -c "import urllib.request; urllib.request.urlopen(\'http://127.0.0.1:8000/health\',timeout=3)"'
                        }
                    }
                }
            }
        }

        stage('Operacion real: crear y consultar') {
            steps {
                script {
                    if (isUnix()) {
                        sh '''
                            docker compose -f "$COMPOSE_FILE" cp ci/verificar_incidente.py web:/tmp/verificar_incidente.py
                            docker compose -f "$COMPOSE_FILE" exec -T web python /tmp/verificar_incidente.py
                        '''
                    } else {
                        bat '''
                            docker compose -f "%COMPOSE_FILE%" cp ci/verificar_incidente.py web:/tmp/verificar_incidente.py
                            docker compose -f "%COMPOSE_FILE%" exec -T web python /tmp/verificar_incidente.py
                        '''
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                // Se detienen ambos contenedores sin borrar los datos persistidos.
                if (isUnix()) {
                    sh(script: 'docker compose -f "$COMPOSE_FILE" down --remove-orphans', returnStatus: true)
                } else {
                    bat(script: 'docker compose -f "%COMPOSE_FILE%" down --remove-orphans', returnStatus: true)
                }
            }
        }
    }
}
