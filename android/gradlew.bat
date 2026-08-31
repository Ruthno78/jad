@rem Gradle wrapper script for Windows
@if "%DEBUG%"=="" @echo off
@rem Set local scope for the variables
setlocal
set DIR=%~dp0
java -classpath "%DIR%\gradle\wrapper\gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain %*
