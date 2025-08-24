{{- define "print2.name" -}}
{{ .Chart.Name }}
{{- end -}}

{{- define "print2.fullname" -}}
{{ include "print2.name" . }}
{{- end -}}
