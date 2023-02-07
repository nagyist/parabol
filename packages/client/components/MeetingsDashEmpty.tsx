import styled from '@emotion/styled'
import React from 'react'
import {Breakpoint} from '~/types/constEnums'
import makeMinWidthMediaQuery from '~/utils/makeMinWidthMediaQuery'

const maybeTabletPlusMediaQuery = makeMinWidthMediaQuery(Breakpoint.FUZZY_TABLET)

const Section = styled('div')({
  margin: 8,
  padding: 0
})

const Heading = styled('h1')({
  fontSize: 24,
  margin: '0 0 16px',
  padding: 0
})

const Copy = styled('p')({
  fontSize: 14,
  lineHeight: '20px',
  margin: 0,
  padding: 0,
  [maybeTabletPlusMediaQuery]: {
    fontSize: 16,
    lineHeight: '24px'
  }
})

interface Props {
  name: string
  message: string
}
const MeetingsDashNewUser = (props: Props) => {
  const {name, message} = props
  return (
    <Section>
      <Heading>{`Hi ${name},`}</Heading>
      <Copy>{`${message}`}</Copy>
    </Section>
  )
}

export default MeetingsDashNewUser
