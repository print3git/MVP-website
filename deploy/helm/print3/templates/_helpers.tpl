{{- define "print3.name" -}}
{{ .Chart.Name }}
{{- end -}}

{{- define "print3.fullname" -}}
{{ include "print3.name" . }}
{{- end -}}
