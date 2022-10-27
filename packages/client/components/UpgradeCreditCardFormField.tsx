import React from 'react'
import UpgradeCreditCardFormFieldIcon from "./UpgradeCreditCardFormFieldIcon";
import UpgradeCreditCardFormFieldBlock from "./UpgradeCreditCardFormFieldBlock";

interface Props {
  autoComplete: string
  autoFocus?: boolean
  className?: string
  error: string | undefined
  dirty: boolean
  iconName: string
  maxLength: number
  onBlur?: (e: React.FocusEvent) => void
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder: string
  value: string
  name: string
}

const UpgradeCreditCardFormField = (props: Props) => {
  const {
    autoComplete,
    autoFocus,
    className,
    dirty,
    error,
    iconName,
    name,
    maxLength,
    onBlur,
    onChange,
    placeholder,
    value
  } = props

  const requireNumeric = (e: React.KeyboardEvent) => {
    // keep Enter around to let them submit
    if (e.key !== 'Enter' && isNaN(parseInt(e.key, 10))) {
      e.preventDefault()
    }
  }
  const hasError = dirty && !!error
  return (
    <UpgradeCreditCardFormFieldBlock className={className} hasError={hasError}>
      <UpgradeCreditCardFormFieldIcon hasError={hasError}>{iconName}</UpgradeCreditCardFormFieldIcon>
      <input
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        onBlur={onBlur}
        onChange={onChange}
        maxLength={maxLength}
        name={name}
        placeholder={placeholder}
        onKeyPress={requireNumeric}
        type='text'
        value={value}
      />
    </UpgradeCreditCardFormFieldBlock>
  )
}

export default UpgradeCreditCardFormField
