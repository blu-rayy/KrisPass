import { Input } from '@/components/ui/Input'
import type { Participant } from '@/types'

interface Props {
  defaults?: Partial<Participant>
}

export function ParticipantFields({ defaults }: Props) {
  return (
    <div className="space-y-5">
      {/* Type & Name */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Identity</p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="participant_type" className="block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              id="participant_type"
              name="participant_type"
              defaultValue={defaults?.participant_type ?? 'attendee'}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="attendee">Attendee</option>
              <option value="officer">Officer</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input id="last_name" name="last_name" label="Last name" defaultValue={defaults?.last_name} required />
            <Input id="first_name" name="first_name" label="First name" defaultValue={defaults?.first_name} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input id="middle_name" name="middle_name" label="Middle name" defaultValue={defaults?.middle_name ?? ''} />
            <Input id="suffix" name="suffix" label="Suffix" placeholder="Jr., III…" defaultValue={defaults?.suffix ?? ''} />
          </div>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Contact */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contact</p>
        <div className="space-y-3">
          <Input id="school_email" name="school_email" type="email" label="School email" defaultValue={defaults?.school_email} required placeholder="student@feutech.edu.ph" />
          <Input id="personal_email" name="personal_email" type="email" label="Personal email" defaultValue={defaults?.personal_email} required placeholder="student@gmail.com" />
          <Input id="contact_no" name="contact_no" label="Contact number" defaultValue={defaults?.contact_no ?? ''} placeholder="+63 9XX XXX XXXX" />
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Academic */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Academic</p>
        <div className="space-y-3">
          <Input id="school" name="school" label="School" defaultValue={defaults?.school ?? ''} placeholder="FEU Tech" />
          <Input id="student_number" name="student_number" label="Student number" defaultValue={defaults?.student_number} required placeholder="2021XXXXXXX" />
          <Input id="degree_program" name="degree_program" label="Degree program" defaultValue={defaults?.degree_program ?? ''} placeholder="BSCS" />
          <Input id="year_level" name="year_level" label="Year level" defaultValue={defaults?.year_level ?? ''} placeholder="1st Year" />
          <Input
            id="blocks"
            name="blocks"
            label="Blocks"
            defaultValue={defaults?.blocks?.join(', ') ?? ''}
            placeholder="A1, B2 (comma-separated)"
          />
          <Input
            id="committee"
            name="committee"
            label="Committee"
            defaultValue={defaults?.committee ?? ''}
            placeholder="Academics, Finance… (optional)"
          />
        </div>
      </div>
    </div>
  )
}
