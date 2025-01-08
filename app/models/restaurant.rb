class Restaurant < ApplicationRecord
    validates :place_id, presence: true, uniqueness: true
    has_many :favorites
    has_many :reviews
end
