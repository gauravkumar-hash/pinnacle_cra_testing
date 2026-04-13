import { useState, useEffect } from "react"
import { Modal, Input, Select, Button, Space, Typography, Alert } from "antd"
import { CopyOutlined, CheckOutlined } from "@ant-design/icons"

const { TextArea } = Input
const { Text } = Typography

// Survey templates
const SURVEY_TEMPLATES = {
  empty: {
    label: "Empty Template",
    value: {}
  },
  lifestyle_basic: {
    label: "Lifestyle Survey Basic",
    value: {"title":"Lifestyle Survey Basic","sections":[{"title":"Personal Information","fields":[{"id":"ethnic_group","title":"Ethnic Group","type":"Radio","options":["Chinese","Malay","Indian","Others"]},{"id":"height","title":"Height (cm)","type":"Number"},{"id":"weight","title":"Weight (kg)","type":"Number"}]},{"title":"Diabetes risk assessment, Physical & Mental wellbeing check","fields":[{"id":"diabetes","title":"Do you have a parent, sibling and/or child diagnosed with Type 2 diabetes?","type":"Radio","options":["Yes","No"]},{"id":"hypertension","title":"Have you ever been told by your doctor that you have high blood pressure (hypertension)?","type":"Radio","options":["Yes","No"]},{"id":"exercise","title":"On the average, how many days do you exercise per week in the last four weeks? (At least 30 minutes or more of medium physical activity such as brisk walking, stair climbing, etc.)","type":"Radio","options":["Never","1-2 days per week","3-4 days per week","5-7 days per week"]},{"id":"smoke","title":"Did you smoke in the last 4 weeks?","type":"Radio","options":["Never","Occasionally","Often, within ½ pack per day","Often, at least ½ pack per day"]},{"id":"alcohol","title":"Did you consume alcohol in the last 4 weeks? (40ml of alcohol equivalent to about 2 drinks of a liquor?","type":"Radio","options":["Never","Seldom","Often, less than 40ml each time"]},{"id":"diet","title":"Is there a difference in your daily life diet in comparison with the recommended healthy diet* in the last 4 weeks.\n\n*Healthy diet refers to: Adequate diet, discipline, different varieties. More fruits and vegetables, coarse grains, non-fat, low fat or dairy products; Adequate high cholesterol food, sugar and fried food. Less salt (5-6g/day).","type":"Radio","options":["About the same","Slight Difference","Significant difference","Quite a difference"]},{"id":"sugary_beverages","title":"How often do you drink sugary beverages? Examples of sugary beverages are soft drinks, fruit juice, yoghurt drinks, coffee, tea and bubble tea.","type":"Radio","options":["0-2 times per week","3-6 times per week","7 or more times per week"]},{"id":"sleep","title":"In the last 4 weeks, how many days was your sleep less than 6 hours?","type":"Radio","options":["0-5 days","6-10 days","More than 10 days, but seldom overnight","More than 10 days, and often overnight"]},{"id":"overall_pressure","title":"In the last 6 months, your overall pressure* is?\n*Pressure includes: family, marriage, love, economy, children's education, health, care for the elderly and so on.","type":"Radio","options":["Low","Average","High","Very High"]},{"id":"work_stress","title":"In the last 6 months, your stress level at work is?","type":"Radio","options":["Low","Average","High","Very High"]},{"id":"health_productivity","title":"During the past 4 weeks, how much did your health problems affect your productivity while you were working?","type":"Radio","options":["No health problems","None of the time","Some of the time","Most of the time","All the above"]}]}]}
  },
  lifestyle_comprehensive: {
    label: "Lifestyle Survey Comprehensive",
    value: {"title":"Lifestyle Survey Comprehensive","sections":[{"title":"Personal Information","fields":[{"id":"ethnic_group","title":"Ethnic Group","options":["Chinese","Malay","Indian","Others"]},{"id":"height","title":"Height (cm)","type":"Number"},{"id":"weight","title":"Weight (kg)","type":"Number"}]},{"title":"Diabetes risk assessment, Physical & Mental wellbeing check","fields":[{"id":"state_of_health","title":"How would you describe your present state of health?","options":["Very healthy","Healthy","Unhealthy","Very unhealthy"]},{"id":"chronic_health","title":"Chronic health conditions are generally progressive. These may include the following: Please select any/all the conditions you have.","type":"Checkbox","options":["High blood sugar/ diabetes mellitus","High blood pressure","High cholesterol","Others such as blood disorders, thyroid condition, kidney condition, mental health disorders or tumours"]},{"id":"health_screening","title":"When was the last time you had a basic health screening (e.g., tests for high blood pressure, diabetes, high blood cholesterol and obesity)?","options":["Less than 2 years ago","More than 2 years ago","Never had any health screening"]},{"id":"diabetes","title":"Do you have a parent, sibling and/or child diagnosed with Type 2 diabetes?"},{"id":"hypertension","title":"Have you ever been told by your doctor that you have high blood pressure (hypertension)?"},{"id":"exercise","title":"On the average, how many days do you exercise per week in the last four weeks? (At least 30 minutes or more of medium physical activity such as brisk walking, stair climbing, etc.)","options":["Never","1-2 days per week","3-4 days per week","5-7 days per week"]},{"id":"exercise_reasons","title":"If you do not exercise, or exercise infrequently, what are the main reasons preventing you from doing so?","type":"Checkbox","required":false,"options":["Lack of time","Lack of interest","Lack of facilities nearby/inconvenient","Health problems/injuries","Others"]},{"id":"pain","title":"Are you experiencing back pain and/or neck and shoulder pain in the last 3 months?","options":["Never","Seldom","Often, average of less than 15 days per month","Often, average of more than 15 days per month"]},{"id":"smoke","title":"Did you smoke in the last 4 weeks?","options":["Never","Occasionally","Often, within ½ pack per day","Often, at least ½ pack per day"]},{"id":"alcohol","title":"Did you consume alcohol in the last 4 weeks? (40ml of alcohol equivalent to about 2 drinks of a liquor?","options":["Never","Seldom","Often, less than 40ml each time"]},{"id":"diet","title":"Is there a difference in your daily life diet in comparison with the recommended healthy diet* in the last 4 weeks.\n\n*Healthy diet refers to: Adequate diet, discipline, different varieties. More fruits and vegetables, coarse grains, non-fat, low fat or dairy products; Adequate high cholesterol food, sugar and fried food. Less salt (5-6g/day).","options":["About the same","Slight Difference","Significant difference","Quite a difference"]},{"id":"sugary_beverages","title":"How often do you drink sugary beverages? Examples of sugary beverages are soft drinks, fruit juice, yoghurt drinks, coffee, tea and bubble tea.","options":["0-2 times per week","3-6 times per week","7 or more times per week"]},{"id":"nutritional_issues","title":"What do you consider to be the major issues with your nutritional choices or eating plan","options":["Eating late at night","Snacking on high-fat foods","Skipping meals/irregular meals","Lack of variety/options around place of work/home"]},{"id":"sleep","title":"In the last 4 weeks, how many days was your sleep less than 6 hours?","options":["0-5 days","6-10 days","More than 10 days, but seldom overnight","More than 10 days, and often overnight"]},{"id":"overall_pressure","title":"In the last 6 months, your overall pressure* is?\n*Pressure includes: family, marriage, love, economy, children's education, health, care for the elderly and so on.","options":["Low","Average","High","Very High"]},{"id":"work_stress","title":"In the last 6 months, your stress level at work is?","options":["Low","Average","High","Very High"]},{"id":"daily_life_stress","title":"In the last 6 months, your stress level in daily life is?","options":["Low","Average","High","Very High"]},{"id":"stress_coping","title":"On a scale of 1 to 4, how well are you coping with your current level of stress? (\"1\" being cannot cope and \"4\" being able to cope very well)","options":["1","2","3","4"]},{"id":"interest_pleasure","title":"Over the last 4 weeks, how often have you felt little interest or pleasure in doing things","options":["Not at all","Several days","More than half the days","Nearly everyday"]},{"id":"depression","title":"Over the last 4 weeks, how often have you felt down, depressed, or hopeless","options":["Not at all","Several days","More than half the days","Nearly everyday"]},{"id":"health_productivity","title":"During the past 4 weeks, how much did your health problems affect your productivity while you were working?","options":["No health problems","None of the time","Some of the time","Most of the time","All the above"]}]}]}
  }
}

interface CorporateSurveyEditorProps {
  open: boolean
  onClose: () => void
  value: Record<string, any>
  onSave: (value: Record<string, any>) => void
  title?: string
}

export function CorporateSurveyEditor({
  open,
  onClose,
  value,
  onSave,
  title = "Edit Corporate Survey"
}: CorporateSurveyEditorProps) {
  const [jsonText, setJsonText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Initialize with formatted JSON when dialog opens
  useEffect(() => {
    if (open) {
      try {
        const formatted = JSON.stringify(value || {}, null, 2)
        setJsonText(formatted)
        setError(null)
      } catch {
        setJsonText("{}")
        setError(null)
      }
    }
  }, [open, value])

  const handleTextChange = (text: string) => {
    setJsonText(text)
    // Validate JSON on change
    try {
      JSON.parse(text)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleTemplateSelect = (templateKey: string) => {
    const template = SURVEY_TEMPLATES[templateKey as keyof typeof SURVEY_TEMPLATES]
    if (template) {
      const formatted = JSON.stringify(template.value, null, 2)
      setJsonText(formatted)
      setError(null)
    }
  }

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonText)
      const formatted = JSON.stringify(parsed, null, 2)
      setJsonText(formatted)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = jsonText
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSave = () => {
    try {
      const parsed = JSON.parse(jsonText)
      onSave(parsed)
      onClose()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleClear = () => {
    setJsonText("{}")
    setError(null)
  }

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          onClick={handleSave}
          disabled={!!error}
        >
          Save
        </Button>
      ]}
    >
      <Space direction="vertical" className="w-full" size="middle">
        {/* Template Selection */}
        <div className="flex items-center gap-2">
          <Text strong>Load Template:</Text>
          <Select
            placeholder="Select a template"
            style={{ width: 250 }}
            onChange={handleTemplateSelect}
            options={Object.entries(SURVEY_TEMPLATES).map(([key, template]) => ({
              value: key,
              label: template.label
            }))}
          />
          <Button onClick={handleFormat}>Format JSON</Button>
          <Button
            icon={copied ? <CheckOutlined /> : <CopyOutlined />}
            onClick={handleCopy}
          >
            {copied ? "Copied!" : "Copy"}
          </Button>
          <Button danger onClick={handleClear}>Clear</Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert
            message="Invalid JSON"
            description={error}
            type="error"
            showIcon
          />
        )}

        {/* JSON Editor */}
        <TextArea
          value={jsonText}
          onChange={(e) => handleTextChange(e.target.value)}
          rows={20}
          className="font-mono text-sm"
          style={{
            resize: "vertical",
            backgroundColor: error ? "#fff2f0" : "#fafafa"
          }}
          placeholder='{"title": "Survey Title", "sections": [...]}'
        />

        {/* Help Text */}
        <Text type="secondary" className="text-xs">
          Survey schema: {"{"}"title": string, "sections": [{"{"}"title": string, "fields": [{"{"}"id": string, "title": string, "type": "Radio"|"Number"|"Text"|"Checkbox", "options"?: string[], "required"?: boolean{"}"}]{"}"}]{"}"}
        </Text>
      </Space>
    </Modal>
  )
}
