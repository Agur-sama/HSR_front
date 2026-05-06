from rest_framework import serializers

from apps.assignments.models import Assignment, WorkDefinition


class WorkDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkDefinition
        fields = ["id", "work_number", "event_start", "event_end", "title", "labor", "workers", "duration", "calculation_mode", "planned_shift", "order_index"]


class AssignmentSerializer(serializers.ModelSerializer):
    works = WorkDefinitionSerializer(many=True, required=False)
    group_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Assignment
        fields = ["id", "title", "description", "group", "group_id", "created_by", "status", "resource_limit", "works", "created_at", "updated_at"]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def create(self, validated_data):
        works = validated_data.pop("works", [])
        group_id = validated_data.pop("group_id", None)
        if group_id:
            validated_data["group_id"] = group_id
        assignment = Assignment.objects.create(created_by=self.context["request"].user, **validated_data)
        for index, work in enumerate(works):
            WorkDefinition.objects.create(assignment=assignment, order_index=work.get("order_index", index), **work)
        return assignment

    def update(self, instance, validated_data):
        works = validated_data.pop("works", None)
        group_id = validated_data.pop("group_id", None)
        if group_id:
            validated_data["group_id"] = group_id
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if works is not None:
            instance.works.all().delete()
            for index, work in enumerate(works):
                WorkDefinition.objects.create(assignment=instance, order_index=work.get("order_index", index), **work)
        return instance
