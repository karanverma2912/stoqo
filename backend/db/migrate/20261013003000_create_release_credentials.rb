class CreateReleaseCredentials < ActiveRecord::Migration[8.1]
  def change
    create_table :release_credentials do |t|
      t.string :name, null: false
      t.text :encrypted_payload, null: false
      t.timestamps
    end
    add_index :release_credentials, :name, unique: true
    create_table :release_accesses do |t|
      t.string :run_id, null: false
      t.string :commit_sha, null: false
      t.timestamps
    end
  end
end
