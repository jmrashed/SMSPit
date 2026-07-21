{{/*
Common labels applied to every resource.
*/}}
{{- define "smspit.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Selector labels for a given component name (e.g. "gateway").
*/}}
{{- define "smspit.selectorLabels" -}}
app: {{ . }}
{{- end -}}
